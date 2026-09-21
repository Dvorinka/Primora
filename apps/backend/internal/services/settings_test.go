package services

import (
	"encoding/json"
	"testing"
)

func TestNormalizeSetting(t *testing.T) {
	t.Parallel()

	boolSpec := SettingSpecs["auth.signup_enabled"]
	intSpec := SettingSpecs["ratelimit.user_per_minute"]
	strSpec := SettingSpecs["mail.smtp_host"]

	cases := []struct {
		name    string
		spec    SettingSpec
		raw     string
		want    string
		wantErr bool
	}{
		{name: "bool true", spec: boolSpec, raw: `true`, want: "true"},
		{name: "bool false", spec: boolSpec, raw: `false`, want: "false"},
		{name: "bool rejects string", spec: boolSpec, raw: `"true"`, wantErr: true},
		{name: "bool rejects int", spec: boolSpec, raw: `1`, wantErr: true},
		{name: "int accepts", spec: intSpec, raw: `120`, want: "120"},
		{name: "int zero allowed", spec: intSpec, raw: `0`, want: "0"},
		{name: "int rejects negative", spec: intSpec, raw: `-5`, wantErr: true},
		{name: "int rejects float", spec: intSpec, raw: `1.5`, wantErr: true},
		{name: "int rejects string", spec: intSpec, raw: `"120"`, wantErr: true},
		{name: "string accepts", spec: strSpec, raw: `"smtp.example.com"`, want: "smtp.example.com"},
		{name: "string rejects number", spec: strSpec, raw: `42`, wantErr: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := normalizeSetting(tc.spec, json.RawMessage(tc.raw))
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error, got %q", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestSortedSettingKeysDeterministic(t *testing.T) {
	t.Parallel()

	first := sortedSettingKeys()
	second := sortedSettingKeys()
	if len(first) != len(SettingSpecs) {
		t.Fatalf("expected %d keys, got %d", len(SettingSpecs), len(first))
	}
	for i := range first {
		if first[i] != second[i] {
			t.Fatalf("key order not deterministic at %d: %q vs %q", i, first[i], second[i])
		}
	}
}
