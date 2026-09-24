package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type Config struct {
	Env                   string
	ServerPort            string
	DatabaseURL           string
	DragonflyURL          string
	StorageRoot           string
	DBXDataDir            string
	AuthInternalBaseURL   string
	PublicURL             string
	UserRateLimitPerMin   int
	APIKeyRateLimitPerMin int

	JWTIssuer     string
	JWTAudience   string
	JWTSecret     string
	JWTTTLSeconds int

	MailFrom     string
	ResendAPIKey string
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	SMTPSecure   bool

	EncryptionKey string

	// Object storage: "local" (BACKEND_STORAGE_ROOT) or "s3".
	StorageDriver    string
	S3Endpoint       string
	S3Region         string
	S3Bucket         string
	S3AccessKeyID    string
	S3SecretAccessKey string
	S3Prefix         string
	S3PathStyle      bool
}

// devEncryptionKey is the built-in credential key for local development only.
// Set PRIMORA_ENCRYPTION_KEY in any real deployment — credentials written with
// this key are readable by anyone with database access.
const devEncryptionKey = "3031323334353637383961626364656630313233343536373839616263646566"

func Load() (Config, error) {
	cfg := Config{
		Env:                   getenv("NODE_ENV", "development"),
		ServerPort:            getenv("BACKEND_PORT", "8080"),
		DatabaseURL:           os.Getenv("DATABASE_URL"),
		DragonflyURL:          getenv("DRAGONFLY_URL", "redis://localhost:6379/0"),
		StorageRoot:           getenv("BACKEND_STORAGE_ROOT", "./tmp/storage"),
		DBXDataDir:            os.Getenv("DBX_DATA_DIR"),
		AuthInternalBaseURL:   getenv("AUTH_INTERNAL_BASE_URL", "http://auth:3001"),
		PublicURL:             getenv("VITE_APP_URL", "http://localhost"),
		UserRateLimitPerMin:   240,
		APIKeyRateLimitPerMin: 600,
		JWTIssuer:             getenv("JWT_ISSUER", "primora-auth"),
		JWTAudience:           getenv("JWT_AUDIENCE", "primora-api"),
		JWTSecret:             os.Getenv("JWT_SECRET"),
		MailFrom:              getenv("MAIL_FROM", "Primora <no-reply@primora.local>"),
		ResendAPIKey:          os.Getenv("RESEND_API_KEY"),
		SMTPHost:              getenv("SMTP_HOST", "localhost"),
		SMTPUser:              os.Getenv("SMTP_USER"),
		SMTPPassword:          os.Getenv("SMTP_PASSWORD"),
		EncryptionKey:         os.Getenv("PRIMORA_ENCRYPTION_KEY"),
		StorageDriver:         getenv("BACKEND_STORAGE_DRIVER", "local"),
		S3Endpoint:            os.Getenv("S3_ENDPOINT"),
		S3Region:              getenv("S3_REGION", "us-east-1"),
		S3Bucket:              os.Getenv("S3_BUCKET"),
		S3AccessKeyID:         os.Getenv("S3_ACCESS_KEY_ID"),
		S3SecretAccessKey:     os.Getenv("S3_SECRET_ACCESS_KEY"),
		S3Prefix:              os.Getenv("S3_PREFIX"),
	}

	smtpPort, err := strconv.Atoi(getenv("SMTP_PORT", "1025"))
	if err != nil {
		return Config{}, fmt.Errorf("parse SMTP_PORT: %w", err)
	}
	cfg.SMTPPort = smtpPort

	jwtTTLSeconds, err := strconv.Atoi(getenv("JWT_TTL_SECONDS", "900"))
	if err != nil {
		return Config{}, fmt.Errorf("parse JWT_TTL_SECONDS: %w", err)
	}
	cfg.JWTTTLSeconds = jwtTTLSeconds

	userRateLimitPerMin, err := parseNonNegativeIntEnv("USER_RATE_LIMIT_PER_MINUTE", cfg.UserRateLimitPerMin)
	if err != nil {
		return Config{}, err
	}
	cfg.UserRateLimitPerMin = userRateLimitPerMin

	apiKeyRateLimitPerMin, err := parseNonNegativeIntEnv("API_KEY_RATE_LIMIT_PER_MINUTE", cfg.APIKeyRateLimitPerMin)
	if err != nil {
		return Config{}, err
	}
	cfg.APIKeyRateLimitPerMin = apiKeyRateLimitPerMin

	smtpSecure, err := strconv.ParseBool(getenv("SMTP_SECURE", "false"))
	if err != nil {
		return Config{}, fmt.Errorf("parse SMTP_SECURE: %w", err)
	}
	cfg.SMTPSecure = smtpSecure

	s3PathStyle, err := strconv.ParseBool(getenv("S3_PATH_STYLE", "true"))
	if err != nil {
		return Config{}, fmt.Errorf("parse S3_PATH_STYLE: %w", err)
	}
	cfg.S3PathStyle = s3PathStyle

	var missing []string
	if cfg.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}
	if cfg.JWTSecret == "" {
		missing = append(missing, "JWT_SECRET")
	}
	switch cfg.StorageDriver {
	case "local":
		if cfg.StorageRoot == "" {
			missing = append(missing, "BACKEND_STORAGE_ROOT")
		}
	case "s3":
		if cfg.S3Bucket == "" {
			missing = append(missing, "S3_BUCKET")
		}
		if cfg.S3AccessKeyID == "" {
			missing = append(missing, "S3_ACCESS_KEY_ID")
		}
		if cfg.S3SecretAccessKey == "" {
			missing = append(missing, "S3_SECRET_ACCESS_KEY")
		}
	default:
		return Config{}, fmt.Errorf("unknown BACKEND_STORAGE_DRIVER %q (want local or s3)", cfg.StorageDriver)
	}
	if cfg.AuthInternalBaseURL == "" {
		missing = append(missing, "AUTH_INTERNAL_BASE_URL")
	}
	if cfg.ResendAPIKey == "" && cfg.SMTPHost == "" {
		missing = append(missing, "RESEND_API_KEY or SMTP_HOST")
	}
	if cfg.EncryptionKey == "" {
		if cfg.Env == "production" {
			missing = append(missing, "PRIMORA_ENCRYPTION_KEY")
		} else {
			cfg.EncryptionKey = devEncryptionKey
		}
	}
	if len(missing) > 0 {
		return Config{}, errors.New("missing required environment values: " + strings.Join(missing, ", "))
	}

	if cfg.DBXDataDir == "" {
		cfg.DBXDataDir = filepath.Join(cfg.StorageRoot, "dbx")
	}

	return cfg, nil
}

func getenv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func parseNonNegativeIntEnv(key string, fallback int) (int, error) {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("parse %s: %w", key, err)
	}
	if value < 0 {
		return 0, fmt.Errorf("%s must be >= 0", key)
	}
	return value, nil
}
