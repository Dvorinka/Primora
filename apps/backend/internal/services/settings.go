package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/repositories"
	"github.com/tdvorak/primora/apps/backend/internal/secrets"
)

// SettingSpec describes a settable instance key: value type, the env var used
// as fallback when no DB row exists, and a built-in default.
type SettingSpec struct {
	Key     string
	Type    string // "bool" | "int" | "string"
	Secret  bool
	EnvKey  string
	Default string
}

// SettingSpecs is the registry of keys manageable in-app. Env vars stay as
// defaults — an app value wins when present.
var SettingSpecs = map[string]SettingSpec{
	"auth.signup_enabled":         {Key: "auth.signup_enabled", Type: "bool", EnvKey: "SIGNUP_ENABLED", Default: "false"},
	"mail.from":                   {Key: "mail.from", Type: "string", EnvKey: "MAIL_FROM", Default: "Primora <no-reply@primora.local>"},
	"mail.resend_api_key":         {Key: "mail.resend_api_key", Type: "string", Secret: true, EnvKey: "RESEND_API_KEY"},
	"mail.smtp_host":              {Key: "mail.smtp_host", Type: "string", EnvKey: "SMTP_HOST"},
	"mail.smtp_port":              {Key: "mail.smtp_port", Type: "int", EnvKey: "SMTP_PORT", Default: "1025"},
	"mail.smtp_user":              {Key: "mail.smtp_user", Type: "string", EnvKey: "SMTP_USER"},
	"mail.smtp_password":          {Key: "mail.smtp_password", Type: "string", Secret: true, EnvKey: "SMTP_PASSWORD"},
	"mail.smtp_secure":            {Key: "mail.smtp_secure", Type: "bool", EnvKey: "SMTP_SECURE", Default: "false"},
	"ratelimit.user_per_minute":   {Key: "ratelimit.user_per_minute", Type: "int", EnvKey: "USER_RATE_LIMIT_PER_MINUTE", Default: "240"},
	"ratelimit.api_key_per_minute": {Key: "ratelimit.api_key_per_minute", Type: "int", EnvKey: "API_KEY_RATE_LIMIT_PER_MINUTE", Default: "600"},
}

const settingsCacheTTL = 15 * time.Second

// resolvedSetting holds the stored string form: plaintext for normal keys,
// base64 ciphertext for secrets — Resolve() decrypts on read.
type resolvedSetting struct {
	value  string
	secret bool
}

// SettingsService resolves instance settings: DB row > env var > default.
// Values cache briefly so per-request consumers (rate limits) stay cheap.
type SettingsService struct {
	repo      *repositories.CoreRepository
	encryptor *secrets.Encryptor

	mu      sync.Mutex
	cache   map[string]resolvedSetting
	cacheAt time.Time
}

func NewSettingsService(repo *repositories.CoreRepository, encryptor *secrets.Encryptor) *SettingsService {
	return &SettingsService{repo: repo, encryptor: encryptor}
}

// Resolve returns the effective string value plus its source
// ("app" | "env" | "default"). Secret DB values are decrypted.
func (s *SettingsService) Resolve(ctx context.Context, key string) (value, source string, err error) {
	spec, ok := SettingSpecs[key]
	if !ok {
		return "", "", fmt.Errorf("unknown setting: %s", key)
	}
	row, err := s.stored(ctx, key)
	if err != nil {
		return "", "", err
	}
	if row != nil {
		raw := row.value
		if row.secret {
			raw, err = s.decrypt(raw)
			if err != nil {
				return "", "", fmt.Errorf("decrypt %s: %w", key, err)
			}
		}
		return raw, "app", nil
	}
	if env := os.Getenv(spec.EnvKey); env != "" {
		return env, "env", nil
	}
	return spec.Default, "default", nil
}

func (s *SettingsService) GetBool(ctx context.Context, key string) (bool, error) {
	raw, _, err := s.Resolve(ctx, key)
	if err != nil {
		return false, err
	}
	v, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("setting %s is not a bool: %q", key, raw)
	}
	return v, nil
}

func (s *SettingsService) GetInt(ctx context.Context, key string) (int, error) {
	raw, _, err := s.Resolve(ctx, key)
	if err != nil {
		return 0, err
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("setting %s is not an int: %q", key, raw)
	}
	return v, nil
}

// RateLimitPerMinute is the hot-path helper for the auth middleware.
func (s *SettingsService) RateLimitPerMinute(ctx context.Context, scope string) int {
	key := "ratelimit.user_per_minute"
	if scope == "api_key" {
		key = "ratelimit.api_key_per_minute"
	}
	v, err := s.GetInt(ctx, key)
	if err != nil {
		spec := SettingSpecs[key]
		fallback, _ := strconv.Atoi(spec.Default)
		return fallback
	}
	return v
}

// ValidateAndStore type-checks the raw JSON value against the registry and
// persists it. Secret values are encrypted before they touch the DB.
func (s *SettingsService) Store(ctx context.Context, key string, raw json.RawMessage, updatedBy string) error {
	spec, ok := SettingSpecs[key]
	if !ok {
		return fmt.Errorf("unknown setting: %s", key)
	}
	plain, err := normalizeSetting(spec, raw)
	if err != nil {
		return err
	}
	value := []byte(strconv.Quote(plain))
	if spec.Secret {
		ciphertext, err := s.encryptor.Encrypt([]byte(plain))
		if err != nil {
			return fmt.Errorf("encrypt %s: %w", key, err)
		}
		value = []byte(strconv.Quote(base64.StdEncoding.EncodeToString(ciphertext)))
	}
	_, err = s.repo.UpsertSetting(ctx, db.UpsertSettingParams{
		Key:       key,
		Column2:   value,
		Secret:    spec.Secret,
		UpdatedBy: &updatedBy,
	})
	if err != nil {
		return err
	}
	s.invalidate()
	return nil
}

func (s *SettingsService) Delete(ctx context.Context, key string) error {
	if _, ok := SettingSpecs[key]; !ok {
		return fmt.Errorf("unknown setting: %s", key)
	}
	if err := s.repo.DeleteSetting(ctx, key); err != nil {
		return err
	}
	s.invalidate()
	return nil
}

// IsAdmin reports whether the actor holds the platform admin role
// (better-auth `user.role`), not an org/project role.
func (s *SettingsService) IsAdmin(ctx context.Context, authSubject string) bool {
	role, err := s.repo.GetAuthUserRole(ctx, authSubject)
	return err == nil && role == "admin"
}

func (s *SettingsService) AuthUserCount(ctx context.Context) (int64, error) {
	return s.repo.CountAuthUsers(ctx)
}

// ListResolved returns every registered key with its effective state.
// Secret values are masked — never returned.
func (s *SettingsService) ListResolved(ctx context.Context) ([]ResolvedSetting, error) {
	stored, err := s.loadStored(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]ResolvedSetting, 0, len(SettingSpecs))
	for _, key := range sortedSettingKeys() {
		spec := SettingSpecs[key]
		entry := ResolvedSetting{Key: key, Secret: spec.Secret, Type: spec.Type}
		if row, ok := stored[key]; ok {
			entry.IsSet = true
			entry.Source = "app"
			if !spec.Secret {
				entry.Value = json.RawMessage(strconv.Quote(row.value))
			}
		} else if env := os.Getenv(spec.EnvKey); env != "" {
			entry.Source = "env"
			if !spec.Secret {
				entry.Value = json.RawMessage(strconv.Quote(env))
			}
		} else {
			entry.Source = "default"
			if !spec.Secret {
				entry.Value = json.RawMessage(strconv.Quote(spec.Default))
			}
		}
		out = append(out, entry)
	}
	return out, nil
}

type ResolvedSetting struct {
	Key    string          `json:"key"`
	Type   string          `json:"type"`
	Secret bool            `json:"secret"`
	IsSet  bool            `json:"is_set"`
	Source string          `json:"source"`
	Value  json.RawMessage `json:"value,omitempty"`
}

func sortedSettingKeys() []string {
	keys := make([]string, 0, len(SettingSpecs))
	for k := range SettingSpecs {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func (s *SettingsService) loadStored(ctx context.Context) (map[string]resolvedSetting, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cache != nil && time.Since(s.cacheAt) < settingsCacheTTL {
		return s.cache, nil
	}
	rows, err := s.repo.ListSettings(ctx)
	if err != nil {
		return nil, err
	}
	fresh := make(map[string]resolvedSetting, len(rows))
	for _, r := range rows {
		encoded, err := unwrapSettingValue(r.Value)
		if err != nil {
			continue // unreadable row — treat as unset rather than break consumers
		}
		fresh[r.Key] = resolvedSetting{value: encoded, secret: r.Secret}
	}
	s.cache = fresh
	s.cacheAt = time.Now()
	return fresh, nil
}

func (s *SettingsService) stored(ctx context.Context, key string) (*resolvedSetting, error) {
	all, err := s.loadStored(ctx)
	if err != nil {
		// cold-cache fallback: direct lookup
		row, err := s.repo.GetSetting(ctx, key)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		if err != nil {
			return nil, err
		}
		encoded, err := unwrapSettingValue(row.Value)
		if err != nil {
			return nil, err
		}
		return &resolvedSetting{value: encoded, secret: row.Secret}, nil
	}
	if row, ok := all[key]; ok {
		return &row, nil
	}
	return nil, nil
}

func (s *SettingsService) decrypt(ciphertextB64 string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return "", err
	}
	plain, err := s.encryptor.Decrypt(raw)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

func (s *SettingsService) invalidate() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cache = nil
}

// unwrapSettingValue decodes the JSONB column: every stored value is a JSON
// string — the plaintext for normal keys, base64 ciphertext for secrets.
func unwrapSettingValue(raw []byte) (string, error) {
	var encoded string
	if err := json.Unmarshal(raw, &encoded); err != nil {
		return "", err
	}
	return encoded, nil
}

// normalizeSetting validates raw JSON against the spec type and returns the
// canonical string form stored/compared internally.
func normalizeSetting(spec SettingSpec, raw json.RawMessage) (string, error) {
	switch spec.Type {
	case "bool":
		var v bool
		if err := json.Unmarshal(raw, &v); err != nil {
			return "", fmt.Errorf("%s expects a boolean", spec.Key)
		}
		return strconv.FormatBool(v), nil
	case "int":
		var v int
		if err := json.Unmarshal(raw, &v); err != nil {
			return "", fmt.Errorf("%s expects an integer", spec.Key)
		}
		if v < 0 {
			return "", fmt.Errorf("%s must be >= 0", spec.Key)
		}
		return strconv.Itoa(v), nil
	default:
		var v string
		if err := json.Unmarshal(raw, &v); err != nil {
			return "", fmt.Errorf("%s expects a string", spec.Key)
		}
		if len(v) > 512 {
			return "", fmt.Errorf("%s exceeds 512 chars", spec.Key)
		}
		return v, nil
	}
}
