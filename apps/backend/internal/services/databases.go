package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/dbx"
	"github.com/tdvorak/primora/apps/backend/internal/models"
)

// DBConnectionConfig holds the server-side credential payload for a saved
// connection. It is stored in core.db_connections.config and never serialized
// to the client — see DBConnectionSummary.
type DBConnectionConfig struct {
	Host          string `json:"host"`
	Port          *int   `json:"port,omitempty"`
	Database      string `json:"database,omitempty"`
	Username      string `json:"username,omitempty"`
	Password      string `json:"password,omitempty"`
	SSL           *bool  `json:"ssl,omitempty"`
	DriverProfile string `json:"driver_profile,omitempty"`
}

// ManagedDBSeed describes a first-party connection auto-registered on every
// project (the platform's own Postgres and Dragonfly).
type ManagedDBSeed struct {
	Name   string
	DBType string
	Config DBConnectionConfig
}

type CreateDBConnectionInput struct {
	Name          string `json:"name" validate:"required,min=1"`
	DBType        string `json:"db_type" validate:"required,oneof=postgres mysql sqlite redis mongodb sqlserver duckdb clickhouse cassandra"`
	Host          string `json:"host" validate:"required"`
	Port          *int   `json:"port" validate:"omitempty,min=1,max=65535"`
	Database      string `json:"database"`
	Username      string `json:"username"`
	Password      string `json:"password"`
	SSL           *bool  `json:"ssl"`
	DriverProfile string `json:"driver_profile"`
}

// DBConnectionSummary is the client-facing shape — config minus secrets.
type DBConnectionSummary struct {
	ID          uuid.UUID `json:"id"`
	ProjectID   uuid.UUID `json:"project_id"`
	Name        string    `json:"name"`
	DBType      string    `json:"db_type"`
	Host        string    `json:"host"`
	Port        *int      `json:"port"`
	Database    string    `json:"database"`
	Username    string    `json:"username"`
	SSL         *bool     `json:"ssl"`
	IsManaged   bool      `json:"is_managed"`
	HasPassword bool      `json:"has_password"`
}

func parseDBConnectionConfig(raw []byte) DBConnectionConfig {
	var cfg DBConnectionConfig
	_ = json.Unmarshal(raw, &cfg)
	return cfg
}

func toDBConnectionSummary(row db.CoreDbConnection) DBConnectionSummary {
	cfg := parseDBConnectionConfig(row.Config)
	return DBConnectionSummary{
		ID:          row.ID,
		ProjectID:   row.ProjectID,
		Name:        row.Name,
		DBType:      row.DbType,
		Host:        cfg.Host,
		Port:        cfg.Port,
		Database:    cfg.Database,
		Username:    cfg.Username,
		SSL:         cfg.SSL,
		IsManaged:   row.IsManaged,
		HasPassword: cfg.Password != "",
	}
}

// dbxConnectionName derives the DBX-internal name. The project prefix keeps
// same-named connections in different projects from clobbering each other in
// DBX's shared storage.
func dbxConnectionName(projectID uuid.UUID, name string) string {
	short := strings.ReplaceAll(projectID.String(), "-", "")[:8]
	return "prj_" + short + "_" + name
}

func (s *PlatformService) dbxArgsFor(row db.CoreDbConnection) map[string]any {
	cfg := parseDBConnectionConfig(row.Config)
	args := map[string]any{
		"name":    dbxConnectionName(row.ProjectID, row.Name),
		"db_type": row.DbType,
		"host":    cfg.Host,
	}
	if cfg.Port != nil {
		args["port"] = *cfg.Port
	}
	if cfg.Database != "" {
		args["database"] = cfg.Database
	}
	if cfg.Username != "" {
		args["username"] = cfg.Username
	}
	if cfg.Password != "" {
		args["password"] = cfg.Password
	}
	if cfg.SSL != nil {
		args["ssl"] = *cfg.SSL
	}
	if cfg.DriverProfile != "" {
		args["driver_profile"] = cfg.DriverProfile
	}
	return args
}

// seedManagedConnections registers the platform's own Postgres and Dragonfly
// on the project. Runs on list so existing projects pick them up too.
func (s *PlatformService) seedManagedConnections(ctx context.Context, projectID uuid.UUID) {
	for _, seed := range s.managedDBSeeds {
		_, err := s.repo.Queries().GetDBConnectionByName(ctx, db.GetDBConnectionByNameParams{
			ProjectID: projectID,
			Name:      seed.Name,
		})
		if err == nil {
			continue
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			continue
		}
		cfgBytes, _ := json.Marshal(seed.Config)
		_, _ = s.repo.Queries().CreateDBConnection(ctx, db.CreateDBConnectionParams{
			ProjectID: projectID,
			Name:      seed.Name,
			DbType:    seed.DBType,
			Config:    cfgBytes,
			IsManaged: true,
		})
	}
}

func (s *PlatformService) DBXStatus(ctx context.Context, actor *models.Actor) (map[string]any, error) {
	if actor == nil {
		return nil, errors.New("authentication required")
	}
	if s.dbx == nil {
		return map[string]any{"available": false, "reason": "dbx not configured"}, nil
	}
	return s.dbx.Status(ctx), nil
}

func (s *PlatformService) ListDBConnections(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]DBConnectionSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	s.seedManagedConnections(ctx, projectID)
	rows, err := s.repo.Queries().ListDBConnections(ctx, projectID)
	if err != nil {
		return nil, err
	}
	out := make([]DBConnectionSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, toDBConnectionSummary(row))
	}
	return out, nil
}

func (s *PlatformService) CreateDBConnection(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input CreateDBConnectionInput, requestID string) (DBConnectionSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return DBConnectionSummary{}, err
	}
	name := normalizeSlug(input.Name)
	if name == "" {
		return DBConnectionSummary{}, errors.New("name must contain letters or digits")
	}
	cfg := DBConnectionConfig{
		Host:          strings.TrimSpace(input.Host),
		Port:          input.Port,
		Database:      strings.TrimSpace(input.Database),
		Username:      strings.TrimSpace(input.Username),
		Password:      input.Password,
		SSL:           input.SSL,
		DriverProfile: strings.TrimSpace(input.DriverProfile),
	}
	cfgBytes, _ := json.Marshal(cfg)
	var createdBy pgtype.UUID
	if actor.UserID != nil {
		createdBy = pgtype.UUID{Bytes: *actor.UserID, Valid: true}
	}
	row, err := s.repo.Queries().CreateDBConnection(ctx, db.CreateDBConnectionParams{
		ProjectID:       projectID,
		Name:            name,
		DbType:          input.DBType,
		Config:          cfgBytes,
		CreatedByUserID: createdBy,
	})
	if err != nil {
		if strings.Contains(err.Error(), "db_connections_project_id_name_key") {
			return DBConnectionSummary{}, fmt.Errorf("a connection named %s already exists", name)
		}
		return DBConnectionSummary{}, err
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "db_connection.created", "db_connection", row.ID.String(), map[string]any{
			"name": row.Name, "db_type": row.DbType,
		}))
	}
	return toDBConnectionSummary(row), nil
}

func (s *PlatformService) DeleteDBConnection(ctx context.Context, actor *models.Actor, projectID, connectionID uuid.UUID, requestID string) error {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return err
	}
	row, err := s.repo.Queries().GetDBConnectionByID(ctx, connectionID)
	if err != nil {
		return err
	}
	if row.ProjectID != projectID {
		return fmt.Errorf("connection access denied")
	}
	if row.IsManaged {
		return fmt.Errorf("platform-managed connections cannot be removed")
	}
	if _, err := s.repo.Queries().DeleteDBConnection(ctx, db.DeleteDBConnectionParams{
		ID:        connectionID,
		ProjectID: projectID,
	}); err != nil {
		return err
	}
	if s.dbx != nil {
		s.dbx.RemoveConnection(ctx, dbxConnectionName(projectID, row.Name))
	}
	project, _ := s.repo.Queries().GetProjectByID(ctx, projectID)
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "db_connection.deleted", "db_connection", connectionID.String(), map[string]any{
		"name": row.Name,
	}))
	return nil
}

// connForTool resolves the connection row, checks access, and registers it
// with the DBX subprocess. Write tools require admin/developer.
func (s *PlatformService) connForTool(ctx context.Context, actor *models.Actor, projectID, connectionID uuid.UUID, write bool) (db.CoreDbConnection, error) {
	roles := []string{"admin", "developer", "viewer"}
	if write {
		roles = []string{"admin", "developer"}
	}
	if err := s.requireProjectRole(ctx, actor, projectID, roles...); err != nil {
		return db.CoreDbConnection{}, err
	}
	row, err := s.repo.Queries().GetDBConnectionByID(ctx, connectionID)
	if err != nil {
		return db.CoreDbConnection{}, err
	}
	if row.ProjectID != projectID {
		return db.CoreDbConnection{}, fmt.Errorf("connection access denied")
	}
	if s.dbx == nil {
		return db.CoreDbConnection{}, errors.New("dbx not configured")
	}
	if err := s.dbx.EnsureConnection(ctx, dbxConnectionName(projectID, row.Name), s.dbxArgsFor(row)); err != nil {
		return db.CoreDbConnection{}, err
	}
	return row, nil
}

func (s *PlatformService) TestDBConnection(ctx context.Context, actor *models.Actor, projectID, connectionID uuid.UUID) (map[string]any, error) {
	row, err := s.connForTool(ctx, actor, projectID, connectionID, true)
	if err != nil {
		return nil, err
	}
	name := dbxConnectionName(projectID, row.Name)
	tool, args := "dbx_list_databases", map[string]any{"connection_name": name}
	if row.DbType == "redis" {
		tool, args = "dbx_execute_redis_command", map[string]any{"connection_name": name, "command": "PING"}
	}
	if _, err := s.dbx.Call(ctx, tool, args); err != nil {
		return map[string]any{"ok": false, "error": err.Error()}, nil
	}
	return map[string]any{"ok": true}, nil
}

func (s *PlatformService) ListDBXDatabases(ctx context.Context, actor *models.Actor, projectID, connectionID uuid.UUID) (map[string]any, error) {
	row, err := s.connForTool(ctx, actor, projectID, connectionID, false)
	if err != nil {
		return nil, err
	}
	text, err := s.dbx.Call(ctx, "dbx_list_databases", map[string]any{"connection_name": dbxConnectionName(projectID, row.Name)})
	if err != nil {
		return nil, err
	}
	if objs := dbx.ParseBullets(text); objs != nil {
		names := make([]string, len(objs))
		for i, o := range objs {
			names[i] = o.Name
		}
		return map[string]any{"databases": names}, nil
	}
	return map[string]any{"databases": []string{}, "raw": text}, nil
}

func (s *PlatformService) ListDBXTables(ctx context.Context, actor *models.Actor, projectID, connectionID uuid.UUID, database, schema string) (map[string]any, error) {
	row, err := s.connForTool(ctx, actor, projectID, connectionID, false)
	if err != nil {
		return nil, err
	}
	args := map[string]any{"connection_name": dbxConnectionName(projectID, row.Name)}
	if database != "" {
		args["database"] = database
	}
	if schema != "" {
		args["schema"] = schema
	}
	text, err := s.dbx.Call(ctx, "dbx_list_tables", args)
	if err != nil {
		return nil, err
	}
	if objs := dbx.ParseBullets(text); objs != nil {
		return map[string]any{"tables": objs}, nil
	}
	if t, _ := dbx.ParseMDTable(text); t != nil {
		return map[string]any{"table": t}, nil
	}
	return map[string]any{"tables": []dbx.DBObject{}, "raw": text}, nil
}

func (s *PlatformService) DescribeDBXTable(ctx context.Context, actor *models.Actor, projectID, connectionID uuid.UUID, table, database, schema string) (map[string]any, error) {
	if table == "" {
		return nil, errors.New("table required")
	}
	row, err := s.connForTool(ctx, actor, projectID, connectionID, false)
	if err != nil {
		return nil, err
	}
	args := map[string]any{"connection_name": dbxConnectionName(projectID, row.Name), "table": table}
	if database != "" {
		args["database"] = database
	}
	if schema != "" {
		args["schema"] = schema
	}
	text, err := s.dbx.Call(ctx, "dbx_describe_table", args)
	if err != nil {
		return nil, err
	}
	if t, _ := dbx.ParseMDTable(text); t != nil {
		return map[string]any{"table": t}, nil
	}
	return map[string]any{"raw": text}, nil
}

func (s *PlatformService) DBXSchemaContext(ctx context.Context, actor *models.Actor, projectID, connectionID uuid.UUID, database, schema string) (map[string]any, error) {
	row, err := s.connForTool(ctx, actor, projectID, connectionID, false)
	if err != nil {
		return nil, err
	}
	args := map[string]any{"connection_name": dbxConnectionName(projectID, row.Name)}
	if database != "" {
		args["database"] = database
	}
	if schema != "" {
		args["schema"] = schema
	}
	text, err := s.dbx.Call(ctx, "dbx_get_schema_context", args)
	if err != nil {
		return nil, err
	}
	return map[string]any{"context": text}, nil
}

func (s *PlatformService) ExecuteDBXQuery(ctx context.Context, actor *models.Actor, projectID, connectionID uuid.UUID, sql, database string) (map[string]any, error) {
	row, err := s.connForTool(ctx, actor, projectID, connectionID, true)
	if err != nil {
		return nil, err
	}
	args := map[string]any{"connection_name": dbxConnectionName(projectID, row.Name), "sql": sql}
	if database != "" {
		args["database"] = database
	}
	text, err := s.dbx.Call(ctx, "dbx_execute_query", args)
	if err != nil {
		return nil, err
	}
	if t, _ := dbx.ParseMDTable(text); t != nil {
		return map[string]any{"table": t}, nil
	}
	return map[string]any{"raw": text}, nil
}

// dbxIdent guards identifiers interpolated into introspection SQL — the
// graph queries are built as strings, so only plain names are allowed.
var dbxIdent = regexp.MustCompile(`^[A-Za-z0-9_]+$`)

func safeIdent(s string) (string, bool) {
	if s == "" || !dbxIdent.MatchString(s) {
		return "", false
	}
	return s, true
}

// foreignKeySQL returns a dialect-appropriate FK introspection query.
// The result columns are always: schema, table, column, ref_schema, ref_table, ref_column.
func foreignKeySQL(dbType, schema, database string) (string, string) {
	sch, schOK := safeIdent(schema)
	db, _ := safeIdent(database)
	switch dbType {
	case "postgres", "sqlserver", "duckdb":
		q := `SELECT kcu.table_schema, kcu.table_name, kcu.column_name,
       ccu.table_schema AS ref_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema AND tc.table_name = kcu.table_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.table_schema NOT IN ('pg_catalog', 'information_schema')`
		if schOK {
			q += ` AND kcu.table_schema = '` + sch + `'`
		}
		return q, db
	case "mysql":
		where := "kcu.REFERENCED_TABLE_NAME IS NOT NULL"
		if schOK {
			where += ` AND kcu.TABLE_SCHEMA = '` + sch + `'`
		} else {
			where += " AND kcu.TABLE_SCHEMA = DATABASE()"
		}
		return `SELECT kcu.TABLE_SCHEMA, kcu.TABLE_NAME, kcu.COLUMN_NAME,
       kcu.REFERENCED_TABLE_SCHEMA, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE kcu WHERE ` + where, db
	case "sqlite":
		return `SELECT '' AS table_schema, m.name AS table_name, p."from" AS column_name,
       '' AS ref_schema, p."table" AS ref_table, p."to" AS ref_column
FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) p ON 1 = 1
WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'`, db
	default:
		return "", ""
	}
}

// ListDBXForeignKeys returns FK edges for the schema graph. Introspection
// only — read role is enough even though it rides dbx_execute_query.
func (s *PlatformService) ListDBXForeignKeys(ctx context.Context, actor *models.Actor, projectID, connectionID uuid.UUID, database, schema string) (map[string]any, error) {
	row, err := s.connForTool(ctx, actor, projectID, connectionID, false)
	if err != nil {
		return nil, err
	}
	query, dbArg := foreignKeySQL(row.DbType, schema, database)
	if query == "" {
		return map[string]any{"edges": []map[string]string{}, "note": "schema graph not supported for " + row.DbType}, nil
	}
	args := map[string]any{"connection_name": dbxConnectionName(projectID, row.Name), "sql": query}
	if dbArg != "" {
		args["database"] = dbArg
	}
	text, err := s.dbx.Call(ctx, "dbx_execute_query", args)
	if err != nil {
		return nil, err
	}
	t, _ := dbx.ParseMDTable(text)
	if t == nil {
		return map[string]any{"edges": []map[string]string{}, "raw": text}, nil
	}
	edges := make([]map[string]string, 0, len(t.Rows))
	for _, r := range t.Rows {
		if len(r) < 6 {
			continue
		}
		edges = append(edges, map[string]string{
			"schema": r[0], "table": r[1], "column": r[2],
			"ref_schema": r[3], "ref_table": r[4], "ref_column": r[5],
		})
	}
	return map[string]any{"edges": edges}, nil
}

func (s *PlatformService) ExecuteDBXRedis(ctx context.Context, actor *models.Actor, projectID, connectionID uuid.UUID, command string, dbIndex *int) (map[string]any, error) {
	row, err := s.connForTool(ctx, actor, projectID, connectionID, true)
	if err != nil {
		return nil, err
	}
	args := map[string]any{"connection_name": dbxConnectionName(projectID, row.Name), "command": command}
	if dbIndex != nil {
		args["db"] = *dbIndex
	}
	text, err := s.dbx.Call(ctx, "dbx_execute_redis_command", args)
	if err != nil {
		return nil, err
	}
	return map[string]any{"output": text}, nil
}
