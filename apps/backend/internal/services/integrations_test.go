package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strings"
	"testing"

	"github.com/google/uuid"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
)

func TestSignBodyMatchesReceiverVerification(t *testing.T) {
	secret := "whsec_test_123"
	body := []byte(`{"event":"issue.created","data":{"fingerprint":"abc"}}`)

	got := signBody(secret, body)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	want := hex.EncodeToString(mac.Sum(nil))
	if got != want {
		t.Fatalf("signature mismatch: got %s want %s", got, want)
	}
	if len(got) != 64 {
		t.Fatalf("expected 64-char hex digest, got %d", len(got))
	}
	if signBody(secret, []byte(`{"event":"issue.created"}`)) == got {
		t.Error("different body must produce a different signature")
	}
	if signBody("other-secret", body) == got {
		t.Error("different secret must produce a different signature")
	}
}

func TestIntegrationSummaryNeverExposesCredentials(t *testing.T) {
	ciphertext := []byte("nonce|aes-gcm-ciphertext|contains|api_key=super-secret")
	row := db.CoreIntegration{
		ID:          uuid.New(),
		ProjectID:   uuid.New(),
		Type:        "rybbit",
		Name:        "prod",
		BaseUrl:     "https://analytics.example.com",
		Config:      []byte(`{"site_id":"s1"}`),
		Credentials: ciphertext,
		Status:      "ok",
	}
	summary := toIntegrationSummary(row)

	if !summary.HasCredentials {
		t.Error("expected has_credentials=true")
	}
	raw, err := json.Marshal(summary)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	for _, leak := range []string{"super-secret", "ciphertext", "api_key", "\"credentials\"", "aes-gcm"} {
		if strings.Contains(string(raw), leak) {
			t.Errorf("serialized summary leaks %q: %s", leak, raw)
		}
	}
}

func TestNormalizeWebhookURL(t *testing.T) {
	ok := []string{
		"https://hooks.example.com/x",
		"http://localhost:9000/sink",
		"http://127.0.0.1:9000/sink",
		"http://primora-sink:9000/",
		"http://192.168.1.40:8080/hook",
		"http://nas.internal/events",
	}
	for _, u := range ok {
		if _, err := normalizeWebhookURL(u); err != nil {
			t.Errorf("expected %q accepted: %v", u, err)
		}
	}
	bad := []string{
		"",
		"not-a-url",
		"ftp://example.com",
		"http://example.com/plain-remote",
		"http://8.8.8.8/x",
		"https://",
	}
	for _, u := range bad {
		if _, err := normalizeWebhookURL(u); err == nil {
			t.Errorf("expected %q rejected", u)
		}
	}
}

func TestValidateWebhookEvents(t *testing.T) {
	got, err := validateWebhookEvents([]string{"issue.created", "deploy.marker", "issue.created", " "})
	if err != nil {
		t.Fatalf("validate: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected deduped 2 events, got %v", got)
	}
	if _, err := validateWebhookEvents([]string{"bogus.event"}); err == nil {
		t.Error("expected unknown event rejected")
	}
	for _, ok := range [][]string{
		{"*"},
		{"document.*"},
		{"custom.deploy.done"},
		{"custom.*"},
		{"custom.deploy.*"},
	} {
		if _, err := validateWebhookEvents(ok); err != nil {
			t.Errorf("expected %v accepted, got %v", ok, err)
		}
	}
	for _, bad := range [][]string{
		{"banana.*"}, {"custom..*"}, {"custom.UPPER"}, {"document.exploded"},
	} {
		if _, err := validateWebhookEvents(bad); err == nil {
			t.Errorf("expected %v rejected", bad)
		}
	}
}

func TestPrivateWebhookHostHardening(t *testing.T) {
	private := []string{"localhost", "minio", "echo-svc", "host.docker.internal",
		"10.0.0.4", "172.16.5.5", "192.168.1.10", "fe80::1", "svc.local", "db.internal"}
	public := []string{"169.254.169.254", "fd00:ec2::254", "2130706433", "0x7f000001",
		"8.8.8.8", "example.com", "999999999999"}
	for _, h := range private {
		if !isPrivateWebhookHost(h) {
			t.Errorf("expected %q private", h)
		}
	}
	for _, h := range public {
		if isPrivateWebhookHost(h) {
			t.Errorf("expected %q public/blocked", h)
		}
	}
}
