package handlers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/tdvorak/primora/apps/backend/internal/services"
)

func newTestContext(rawQuery string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	path := "/"
	if rawQuery != "" {
		path += "?" + rawQuery
	}
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, path, nil)
	return ctx, recorder
}

func TestParsePaginationQuery(t *testing.T) {
	t.Parallel()

	t.Run("uses default when absent", func(t *testing.T) {
		t.Parallel()
		ctx, _ := newTestContext("")
		value, ok := parsePaginationQuery(ctx, "limit", 50, 1, 200)
		if !ok {
			t.Fatalf("expected parse to succeed")
		}
		if value != 50 {
			t.Fatalf("unexpected value: %d", value)
		}
	})

	t.Run("parses valid query", func(t *testing.T) {
		t.Parallel()
		ctx, _ := newTestContext("limit=25")
		value, ok := parsePaginationQuery(ctx, "limit", 50, 1, 200)
		if !ok {
			t.Fatalf("expected parse to succeed")
		}
		if value != 25 {
			t.Fatalf("unexpected value: %d", value)
		}
	})

	t.Run("rejects invalid number", func(t *testing.T) {
		t.Parallel()
		ctx, recorder := newTestContext("limit=abc")
		_, ok := parsePaginationQuery(ctx, "limit", 50, 1, 200)
		if ok {
			t.Fatalf("expected parse to fail")
		}
		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("unexpected status: %d", recorder.Code)
		}
	})

	t.Run("rejects out-of-range value", func(t *testing.T) {
		t.Parallel()
		ctx, recorder := newTestContext("limit=500")
		_, ok := parsePaginationQuery(ctx, "limit", 50, 1, 200)
		if ok {
			t.Fatalf("expected parse to fail")
		}
		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("unexpected status: %d", recorder.Code)
		}
	})
}

func TestHandleErrorStatusMapping(t *testing.T) {
	t.Parallel()

	handler := &HTTPHandler{}

	t.Run("maps insufficient role to forbidden", func(t *testing.T) {
		t.Parallel()
		ctx, recorder := newTestContext("")
		handler.handleError(ctx, errors.New("project role admin is insufficient"))
		if recorder.Code != http.StatusForbidden {
			t.Fatalf("unexpected status: %d", recorder.Code)
		}
	})

	t.Run("maps uniqueness to conflict", func(t *testing.T) {
		t.Parallel()
		ctx, recorder := newTestContext("")
		handler.handleError(ctx, errors.New("duplicate key value violates unique constraint"))
		if recorder.Code != http.StatusConflict {
			t.Fatalf("unexpected status: %d", recorder.Code)
		}
	})

	t.Run("maps invalid input to bad request", func(t *testing.T) {
		t.Parallel()
		ctx, recorder := newTestContext("")
		handler.handleError(ctx, errors.New("invalid invitation project scope"))
		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("unexpected status: %d", recorder.Code)
		}
	})

	t.Run("maps missing rows to not found", func(t *testing.T) {
		t.Parallel()
		ctx, recorder := newTestContext("")
		handler.handleError(ctx, pgx.ErrNoRows)
		if recorder.Code != http.StatusNotFound {
			t.Fatalf("unexpected status: %d", recorder.Code)
		}
	})

	t.Run("maps InputError to bad request with message", func(t *testing.T) {
		t.Parallel()
		ctx, recorder := newTestContext("")
		handler.handleError(ctx, services.NewInputError("webhook url must be https"))
		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("unexpected status: %d", recorder.Code)
		}
		if !strings.Contains(recorder.Body.String(), "webhook url must be https") {
			t.Fatalf("expected reason in body, got %s", recorder.Body.String())
		}
	})

	t.Run("maps unique violation to conflict without leaking", func(t *testing.T) {
		t.Parallel()
		ctx, recorder := newTestContext("")
		handler.handleError(ctx, &pgconn.PgError{Code: "23505", Message: "duplicate key value violates unique constraint \"projects_slug_key\""})
		if recorder.Code != http.StatusConflict {
			t.Fatalf("unexpected status: %d", recorder.Code)
		}
		if strings.Contains(recorder.Body.String(), "projects_slug_key") || strings.Contains(recorder.Body.String(), "23505") {
			t.Fatalf("raw constraint leaked: %s", recorder.Body.String())
		}
	})

	t.Run("maps unknown pg error to internal error", func(t *testing.T) {
		t.Parallel()
		ctx, recorder := newTestContext("")
		handler.handleError(ctx, &pgconn.PgError{Code: "XX000", Message: "internal"})
		if recorder.Code != http.StatusInternalServerError {
			t.Fatalf("unexpected status: %d", recorder.Code)
		}
	})
}
