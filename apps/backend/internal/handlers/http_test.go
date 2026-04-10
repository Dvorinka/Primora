package handlers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
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
}
