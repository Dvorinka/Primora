package services

import (
	"reflect"
	"strings"
	"testing"
)

func TestBuildDocumentFilters(t *testing.T) {
	t.Run("eq on a nested path uses #>>", func(t *testing.T) {
		conds, args, err := buildDocumentFilters("meta.city.eq.Prague", 2)
		if err != nil {
			t.Fatalf("err: %v", err)
		}
		want := "data #>> '{meta,city}' = $2"
		if conds[0] != want || !reflect.DeepEqual(args, []any{"Prague"}) {
			t.Fatalf("got %v %v", conds, args)
		}
	})

	t.Run("numeric ops cast to ::numeric", func(t *testing.T) {
		conds, args, err := buildDocumentFilters("age.gt.18,age.lt.65", 2)
		if err != nil {
			t.Fatalf("err: %v", err)
		}
		if !strings.Contains(conds[0], "::numeric > $2") || !strings.Contains(conds[1], "::numeric < $3") {
			t.Fatalf("got %v", conds)
		}
		if args[0] != 18.0 || args[1] != 65.0 {
			t.Fatalf("args: %v", args)
		}
	})

	t.Run("numeric op rejects non-numeric value", func(t *testing.T) {
		_, _, err := buildDocumentFilters("age.gt.abc", 2)
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("like becomes ILIKE", func(t *testing.T) {
		conds, _, err := buildDocumentFilters("name.like.%_smith%", 2)
		if err != nil || conds[0] != "data #>> '{name}' ILIKE $2" {
			t.Fatalf("got %v %v", conds, err)
		}
	})

	t.Run("in becomes ANY with a text array", func(t *testing.T) {
		conds, args, err := buildDocumentFilters("role.in.admin|editor", 2)
		if err != nil || !strings.Contains(conds[0], "= ANY($2)") {
			t.Fatalf("got %v", conds)
		}
		if !reflect.DeepEqual(args[0], []string{"admin", "editor"}) {
			t.Fatalf("args: %v", args)
		}
	})

	t.Run("is null carries no argument", func(t *testing.T) {
		conds, args, err := buildDocumentFilters("deleted_at.is.null", 2)
		if err != nil || len(args) != 0 || conds[0] != "data #>> '{deleted_at}' IS NULL" {
			t.Fatalf("got %v %v", conds, args)
		}
	})

	t.Run("rejects injection-shaped field", func(t *testing.T) {
		_, _, err := buildDocumentFilters("x' OR '1'='1.eq.a", 2)
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("rejects term without a known operator", func(t *testing.T) {
		_, _, err := buildDocumentFilters("age.between.5", 2)
		if err == nil || !strings.Contains(err.Error(), "invalid filter") {
			t.Fatalf("got %v", err)
		}
	})

	t.Run("malformed term errors", func(t *testing.T) {
		_, _, err := buildDocumentFilters("justafield", 2)
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("real columns resolve directly", func(t *testing.T) {
		conds, _, err := buildDocumentFilters("created_at.gt.2026-01-01", 2)
		// created_at is a column — but value isn't numeric so gt must fail
		if err == nil {
			t.Fatalf("expected numeric-required error, got %v", conds)
		}
	})
}

func TestBuildDocumentOrder(t *testing.T) {
	cases := map[string]string{
		"":                  "created_at DESC",
		"name.asc":          "data #>> '{name}' ASC",
		"name":              "data #>> '{name}' ASC",
		"created_at.desc":   "created_at DESC",
		"a.b.asc,id.desc":   "data #>> '{a,b}' ASC, id DESC",
	}
	for in, want := range cases {
		got, err := buildDocumentOrder(in)
		if err != nil {
			t.Fatalf("%q: %v", in, err)
		}
		if got != want {
			t.Errorf("%q: got %q want %q", in, got, want)
		}
	}
	// A non-asc/desc suffix is a nested field path, not a direction error.
	if got, err := buildDocumentOrder("name.sideways"); err != nil || got != "data #>> '{name,sideways}' ASC" {
		t.Errorf("nested order path: got %q err %v", got, err)
	}
	if _, err := buildDocumentOrder("x;drop.asc"); err == nil {
		t.Error("expected field error")
	}
}
