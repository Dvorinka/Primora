package services

import (
	"strings"
	"testing"
)

func TestRenderMailTemplateInvitation(t *testing.T) {
	subject, body, err := renderMailTemplate("invitation", map[string]string{
		"organization": "Acme Corp",
		"invite_url":   "https://app.primora.dev/accept?token=abc",
	})
	if err != nil {
		t.Fatalf("render: %v", err)
	}
	if !strings.Contains(subject, "Acme Corp") {
		t.Fatalf("subject missing organization: %q", subject)
	}
	if !strings.Contains(body, "https://app.primora.dev/accept?token=abc") {
		t.Fatalf("body missing invite url: %q", body)
	}
}

func TestRenderMailTemplateUnknown(t *testing.T) {
	if _, _, err := renderMailTemplate("does-not-exist", nil); err == nil {
		t.Fatal("expected error for unknown template")
	}
}

func TestExtractEmail(t *testing.T) {
	if got := extractEmail("Primora <no-reply@primora.dev>"); got != "no-reply@primora.dev" {
		t.Fatalf("extractEmail = %q", got)
	}
	if got := extractEmail("no-reply@primora.dev"); got != "no-reply@primora.dev" {
		t.Fatalf("extractEmail bare = %q", got)
	}
}
