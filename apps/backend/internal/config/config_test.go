package config

import (
	"strings"
	"testing"
)

func setRequiredEnv(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://primora:primora@localhost:5432/primora?sslmode=disable")
	t.Setenv("JWT_SECRET", "test-secret")
	t.Setenv("BACKEND_STORAGE_ROOT", "./tmp/storage")
	t.Setenv("AUTH_INTERNAL_BASE_URL", "http://auth:3001")
	t.Setenv("SMTP_HOST", "mailpit")
}

func TestLoadRateLimitDefaults(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("USER_RATE_LIMIT_PER_MINUTE", "")
	t.Setenv("API_KEY_RATE_LIMIT_PER_MINUTE", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.UserRateLimitPerMin != 240 {
		t.Fatalf("unexpected USER_RATE_LIMIT_PER_MINUTE default: %d", cfg.UserRateLimitPerMin)
	}
	if cfg.APIKeyRateLimitPerMin != 600 {
		t.Fatalf("unexpected API_KEY_RATE_LIMIT_PER_MINUTE default: %d", cfg.APIKeyRateLimitPerMin)
	}
}

func TestLoadRateLimitRejectsInvalidNumber(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("USER_RATE_LIMIT_PER_MINUTE", "not-a-number")

	_, err := Load()
	if err == nil {
		t.Fatalf("expected parse error")
	}
	if !strings.Contains(err.Error(), "parse USER_RATE_LIMIT_PER_MINUTE") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestLoadRateLimitRejectsNegative(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("API_KEY_RATE_LIMIT_PER_MINUTE", "-1")

	_, err := Load()
	if err == nil {
		t.Fatalf("expected validation error")
	}
	if !strings.Contains(err.Error(), "API_KEY_RATE_LIMIT_PER_MINUTE must be >= 0") {
		t.Fatalf("unexpected error: %v", err)
	}
}
