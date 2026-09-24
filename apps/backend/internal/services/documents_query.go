package services

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/google/uuid"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/models"
)

// PostgREST-lite filtering over document JSONB:
//   ?filter=status.eq.active,age.gt.18,role.in.admin|editor
//   ?order=name.asc,created_at.desc
// Values are always parameterized; only the whitelisted operators and
// field-path syntax below ever reach the SQL string.

var docFieldRe = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

// documentColumns are real table columns — everything else resolves into data.
var documentColumns = map[string]string{
	"id":         "id",
	"created_at": "created_at",
	"updated_at": "updated_at",
}

// docFieldExpr maps a (possibly dotted) field path to a SQL text expression.
// data #>> '{a,b}' extracts nested values as text — the correct comparison
// domain for loosely-typed document fields.
func docFieldExpr(field string) (string, error) {
	if col, ok := documentColumns[field]; ok {
		return col, nil
	}
	parts := strings.Split(field, ".")
	for _, p := range parts {
		if !docFieldRe.MatchString(p) {
			return "", fmt.Errorf("invalid field name %q — use [A-Za-z_][A-Za-z0-9_]* segments", field)
		}
	}
	return fmt.Sprintf("data #>> '{%s}'", strings.Join(parts, ",")), nil
}

// numericExpr wraps the field for ordered comparisons — only used when the
// filter value itself parses as a float, so the cast can never fail.
func numericExpr(expr string) string {
	return fmt.Sprintf("(%s)::numeric", expr)
}

// buildDocumentFilters turns "field.op.value" terms into parameterized SQL.
// Returns the WHERE fragments and the argument list (already $N-numbered via
// startArg). A fragment is empty for `is` filters since they carry no value.
func buildDocumentFilters(filterParam string, startArg int) ([]string, []any, error) {
	var conds []string
	var args []any
	argN := startArg
	next := func(v any) string {
		args = append(args, v)
		argN++
		return fmt.Sprintf("$%d", argN-1)
	}

	var docOps = []string{"eq", "neq", "gt", "gte", "lt", "lte", "like", "in", "is"}

	for _, term := range strings.Split(filterParam, ",") {
		term = strings.TrimSpace(term)
		if term == "" {
			continue
		}
		// Field paths are themselves dotted, so the operator is located by
		// scanning for the first ".<known-op>." — the value may contain dots.
		var field, op, value string
		best := -1
		for _, candidate := range docOps {
			needle := "." + candidate + "."
			if i := strings.Index(term, needle); i > 0 && (best < 0 || i < best) {
				best = i
				field, op, value = term[:i], candidate, term[i+len(needle):]
			}
		}
		if field == "" {
			return nil, nil, fmt.Errorf("invalid filter %q — expected field.op.value (ops: %s)", term, strings.Join(docOps, ", "))
		}
		expr, err := docFieldExpr(field)
		if err != nil {
			return nil, nil, err
		}
		_, isFloat := strconv.ParseFloat(value, 64)

		switch op {
		case "eq", "neq":
			sym := "="
			if op == "neq" {
				sym = "<>"
			}
			conds = append(conds, fmt.Sprintf("%s %s %s", expr, sym, next(value)))
		case "gt", "gte", "lt", "lte":
			if isFloat != nil {
				return nil, nil, fmt.Errorf("filter %q: %s requires a numeric value", term, op)
			}
			sym := map[string]string{"gt": ">", "gte": ">=", "lt": "<", "lte": "<="}[op]
			f, _ := strconv.ParseFloat(value, 64)
			conds = append(conds, fmt.Sprintf("%s %s %s", numericExpr(expr), sym, next(f)))
		case "like":
			conds = append(conds, fmt.Sprintf("%s ILIKE %s", expr, next(value)))
		case "in":
			items := strings.Split(value, "|")
			for i, item := range items {
				items[i] = strings.TrimSpace(item)
			}
			conds = append(conds, fmt.Sprintf("%s = ANY(%s)", expr, next(items)))
		case "is":
			switch value {
			case "null":
				conds = append(conds, fmt.Sprintf("%s IS NULL", expr))
			case "true", "false":
				conds = append(conds, fmt.Sprintf("%s = %s", expr, next(value)))
			default:
				return nil, nil, fmt.Errorf("filter %q: is accepts null|true|false", term)
			}
		default:
			return nil, nil, fmt.Errorf("unknown operator %q in filter %q — supported: eq, neq, gt, gte, lt, lte, like, in, is", op, term)
		}
	}
	return conds, args, nil
}

// buildDocumentOrder turns "name.asc,created_at.desc" into an ORDER BY list.
func buildDocumentOrder(orderParam string) (string, error) {
	if orderParam == "" {
		return "created_at DESC", nil
	}
	var parts []string
	for _, term := range strings.Split(orderParam, ",") {
		term = strings.TrimSpace(term)
		if term == "" {
			continue
		}
		// Direction is a suffix, not a split — field paths are dotted too.
		field, dir := term, "asc"
		if strings.HasSuffix(term, ".desc") {
			field, dir = strings.TrimSuffix(term, ".desc"), "desc"
		} else if strings.HasSuffix(term, ".asc") {
			field = strings.TrimSuffix(term, ".asc")
		}
		expr, err := docFieldExpr(field)
		if err != nil {
			return "", err
		}
		parts = append(parts, expr+" "+strings.ToUpper(dir))
	}
	if len(parts) == 0 {
		return "created_at DESC", nil
	}
	return strings.Join(parts, ", "), nil
}

// SearchDocuments lists documents with PostgREST-style filter/order params.
// Returns the page plus the un-paginated match count for "total".
func (s *PlatformService) SearchDocuments(
	ctx context.Context,
	actor *models.Actor,
	collectionID uuid.UUID,
	filterParam, orderParam string,
	limit, offset int32,
) ([]db.CoreDocument, int64, error) {
	collection, err := s.repo.Queries().GetCollectionByID(ctx, collectionID)
	if err != nil {
		return nil, 0, err
	}
	if err := s.requireProjectRole(ctx, actor, collection.ProjectID, "admin", "developer", "viewer"); err != nil {
		return nil, 0, err
	}

	args := []any{collectionID}
	conds, filterArgs, err := buildDocumentFilters(filterParam, len(args)+1)
	if err != nil {
		return nil, 0, err
	}
	args = append(args, filterArgs...)

	where := "collection_id = $1"
	if len(conds) > 0 {
		where += " AND " + strings.Join(conds, " AND ")
	}
	order, err := buildDocumentOrder(orderParam)
	if err != nil {
		return nil, 0, err
	}

	var total int64
	if err := s.repo.Pool().QueryRow(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM core.documents WHERE %s", where), args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, offset)
	rows, err := s.repo.Pool().Query(ctx, fmt.Sprintf(
		"SELECT * FROM core.documents WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d",
		where, order, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []db.CoreDocument
	for rows.Next() {
		var d db.CoreDocument
		if err := rows.Scan(&d.ID, &d.CollectionID, &d.Data, &d.CreatedByUserID, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, d)
	}
	return out, total, rows.Err()
}
