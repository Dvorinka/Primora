package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"strings"
	"testing"

	"github.com/google/uuid"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/secrets"
)

func testEncryptor(t *testing.T) *secrets.Encryptor {
	t.Helper()
	key := base64.StdEncoding.EncodeToString(make([]byte, 32))
	enc, err := secrets.NewEncryptor(key)
	if err != nil {
		t.Fatalf("NewEncryptor: %v", err)
	}
	return enc
}

func secretLister(t *testing.T, enc *secrets.Encryptor, kv map[string]string) func(context.Context, uuid.UUID) ([]db.ListProjectSecretValuesRow, error) {
	t.Helper()
	return func(context.Context, uuid.UUID) ([]db.ListProjectSecretValuesRow, error) {
		rows := make([]db.ListProjectSecretValuesRow, 0, len(kv))
		for name, value := range kv {
			ct, err := enc.Encrypt([]byte(value))
			if err != nil {
				t.Fatalf("encrypt %s: %v", name, err)
			}
			rows = append(rows, db.ListProjectSecretValuesRow{Name: name, Ciphertext: ct})
		}
		return rows, nil
	}
}

func TestResolveSecretRefs(t *testing.T) {
	enc := testEncryptor(t)
	list := secretLister(t, enc, map[string]string{
		"API_KEY":   "sk_live_99",
		"RECURSIVE": "secret://API_KEY", // must not resolve twice
	})
	pid := uuid.New()

	t.Run("replaces nested and array refs", func(t *testing.T) {
		payload := json.RawMessage(`{
			"token": "secret://API_KEY",
			"nested": {"deep": ["a", "secret://API_KEY", {"x": "secret://API_KEY"}]},
			"plain": "not a secret",
			"num": 42
		}`)
		out, err := resolveSecretRefs(context.Background(), list, enc, pid, payload)
		if err != nil {
			t.Fatalf("resolve: %v", err)
		}
		var doc map[string]any
		if err := json.Unmarshal(out, &doc); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		if doc["token"] != "sk_live_99" {
			t.Errorf("token = %v", doc["token"])
		}
		deep := doc["nested"].(map[string]any)["deep"].([]any)
		if deep[1] != "sk_live_99" || deep[2].(map[string]any)["x"] != "sk_live_99" {
			t.Errorf("nested refs not resolved: %v", deep)
		}
		if doc["plain"] != "not a secret" || doc["num"] != float64(42) {
			t.Errorf("non-ref values changed: %v", doc)
		}
	})

	t.Run("missing ref fails the job", func(t *testing.T) {
		_, err := resolveSecretRefs(context.Background(), list, enc, pid, json.RawMessage(`{"a":"secret://NOPE"}`))
		if err == nil || !strings.Contains(err.Error(), "NOPE") {
			t.Fatalf("expected unresolved error naming NOPE, got %v", err)
		}
	})

	t.Run("embedded ref in a larger string is not resolved", func(t *testing.T) {
		out, err := resolveSecretRefs(context.Background(), list, enc, pid, json.RawMessage(`{"a":"prefix secret://API_KEY suffix"}`))
		if err != nil {
			t.Fatalf("resolve: %v", err)
		}
		if !strings.Contains(string(out), "secret://API_KEY") {
			t.Fatalf("embedded ref must pass through unchanged: %s", out)
		}
	})

	t.Run("resolved value is not re-scanned", func(t *testing.T) {
		out, err := resolveSecretRefs(context.Background(), list, enc, pid, json.RawMessage(`{"a":"secret://RECURSIVE"}`))
		if err != nil {
			t.Fatalf("resolve: %v", err)
		}
		var doc map[string]any
		_ = json.Unmarshal(out, &doc)
		if doc["a"] != "secret://API_KEY" {
			t.Fatalf("single-pass resolution expected, got %v", doc["a"])
		}
	})

	t.Run("invalid JSON fails loudly when a ref is present", func(t *testing.T) {
		_, err := resolveSecretRefs(context.Background(), list, enc, pid, json.RawMessage(`{secret://API_KEY`))
		if err == nil {
			t.Fatal("expected JSON error")
		}
	})

	t.Run("payloads without refs pass through untouched", func(t *testing.T) {
		payload := json.RawMessage(`{"a":1}`)
		out, err := resolveSecretRefs(context.Background(), list, enc, pid, payload)
		if err != nil || string(out) != string(payload) {
			t.Fatalf("passthrough failed: %v %s", err, out)
		}
		// Nil encryptor must fail loudly — a literal secret:// reaching the
		// endpoint is worse than a failed run.
		_, err = resolveSecretRefs(context.Background(), list, nil, pid, json.RawMessage(`{"a":"secret://API_KEY"}`))
		if err == nil {
			t.Fatal("expected error when encryption is not configured")
		}
	})
}
