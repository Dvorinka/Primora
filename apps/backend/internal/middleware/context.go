package middleware

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"

	"github.com/tdvorak/primora/apps/backend/internal/auth"
	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/models"
	"github.com/tdvorak/primora/apps/backend/internal/repositories"
	apperrors "github.com/tdvorak/primora/apps/backend/internal/response"
)

const (
	requestIDKey = "request_id"
	actorKey     = "actor"
)

type AuthMiddleware struct {
	Queries    *repositories.CoreRepository
	Logger     *slog.Logger
	Redis      *redis.Client
	Verifier   *auth.Verifier
	RateLimits RateLimitConfig
}

type RateLimitConfig struct {
	APIKeyPerMinute int
	UserPerMinute   int
}

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.Request.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.NewString()
		}
		c.Set(requestIDKey, requestID)
		c.Writer.Header().Set("X-Request-ID", requestID)
		c.Next()
	}
}

func Logger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		logger.Info("request_complete",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", RequestIDFromContext(c),
			"client_ip", c.ClientIP(),
		)
	}
}

func (m AuthMiddleware) ResolveActor() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := strings.TrimSpace(c.GetHeader("X-API-Key"))
		authz := strings.TrimSpace(c.GetHeader("Authorization"))
		if apiKey == "" && strings.HasPrefix(strings.ToLower(authz), "bearer ") {
			token := strings.TrimSpace(strings.TrimPrefix(authz, "Bearer"))
			if strings.HasPrefix(authz, "Bearer ") {
				token = strings.TrimSpace(strings.TrimPrefix(authz, "Bearer "))
			}
			if strings.HasPrefix(strings.ToLower(authz), "bearer ") {
				apiKey = ""
				actor, err := m.resolveJWTActor(c.Request.Context(), token)
				if err != nil {
					apperrors.Abort(c, http.StatusUnauthorized, "invalid_token", err.Error())
					return
				}
				userIdentity := actor.AuthSubject
				if actor.UserID != nil {
					userIdentity = actor.UserID.String()
				}
				if !m.enforceRateLimit(c, "user", userIdentity, m.RateLimits.UserPerMinute, "User rate limit exceeded") {
					return
				}
				c.Set(actorKey, actor)
				c.Next()
				return
			}
		}

		if apiKey == "" {
			apiKey = strings.TrimSpace(strings.TrimPrefix(authz, "ApiKey "))
		}
		if apiKey != "" {
			actor, err := m.resolveAPIKeyActor(c.Request.Context(), apiKey)
			if err != nil {
				apperrors.Abort(c, http.StatusUnauthorized, "invalid_api_key", err.Error())
				return
			}
			if !m.enforceRateLimit(c, "apikey", actor.APIKeyPrefix, m.RateLimits.APIKeyPerMinute, "API key rate limit exceeded") {
				return
			}
			c.Set(actorKey, actor)
		}
		c.Next()
	}
}

func (m AuthMiddleware) enforceRateLimit(c *gin.Context, scope, identity string, limit int, exceededMessage string) bool {
	if m.Redis == nil || limit <= 0 || identity == "" {
		return true
	}
	key := "ratelimit:" + scope + ":" + identity + ":" + time.Now().UTC().Format("200601021504")
	count, err := m.Redis.Incr(c.Request.Context(), key).Result()
	if err != nil {
		if m.Logger != nil {
			m.Logger.Warn("rate limit increment failed", "scope", scope, "error", err)
		}
		return true
	}
	if count == 1 {
		if err := m.Redis.Expire(c.Request.Context(), key, time.Minute).Err(); err != nil && m.Logger != nil {
			m.Logger.Warn("rate limit expiry update failed", "scope", scope, "error", err)
		}
	}
	ttl, err := m.Redis.TTL(c.Request.Context(), key).Result()
	if err != nil {
		if m.Logger != nil {
			m.Logger.Warn("rate limit ttl lookup failed", "scope", scope, "error", err)
		}
		ttl = time.Minute
	}
	if ttl <= 0 {
		ttl = time.Minute
	}
	resetSeconds := int((ttl + time.Second - 1) / time.Second)
	if resetSeconds < 1 {
		resetSeconds = 1
	}
	remaining := limit - int(count)
	if remaining < 0 {
		remaining = 0
	}
	c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
	c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
	c.Header("X-RateLimit-Reset", strconv.Itoa(resetSeconds))
	if count > int64(limit) {
		c.Header("Retry-After", strconv.Itoa(resetSeconds))
		apperrors.Abort(c, http.StatusTooManyRequests, "rate_limited", exceededMessage)
		return false
	}
	return true
}

func RequireActor(c *gin.Context) (*models.Actor, bool) {
	actor, ok := ActorFromContext(c)
	if !ok {
		apperrors.Abort(c, http.StatusUnauthorized, "authentication_required", "authentication is required")
		return nil, false
	}
	return actor, true
}

func ActorFromContext(c *gin.Context) (*models.Actor, bool) {
	value, ok := c.Get(actorKey)
	if !ok {
		return nil, false
	}
	actor, ok := value.(*models.Actor)
	return actor, ok
}

func RequestIDFromContext(c *gin.Context) string {
	value, ok := c.Get(requestIDKey)
	if !ok {
		return ""
	}
	requestID, _ := value.(string)
	return requestID
}

func (m AuthMiddleware) resolveJWTActor(ctx context.Context, token string) (*models.Actor, error) {
	if m.Verifier == nil {
		return nil, errors.New("jwt verifier not configured")
	}
	claims, err := m.Verifier.ParseToken(token)
	if err != nil {
		return nil, err
	}
	user, err := m.Queries.UpsertUser(ctx, db.UpsertUserParams{
		AuthSubject:   claims.Subject,
		Email:         strings.ToLower(claims.Email),
		Name:          claims.Name,
		EmailVerified: claims.EmailVerified,
	})
	if err != nil {
		return nil, fmt.Errorf("upsert user: %w", err)
	}
	return &models.Actor{
		Type:          models.ActorTypeUser,
		UserID:        &user.ID,
		AuthSubject:   claims.Subject,
		Email:         strings.ToLower(claims.Email),
		EmailVerified: claims.EmailVerified,
		Name:          claims.Name,
		SessionID:     claims.SessionID,
	}, nil
}

func (m AuthMiddleware) resolveAPIKeyActor(ctx context.Context, rawKey string) (*models.Actor, error) {
	parts := strings.Split(rawKey, "_")
	if len(parts) < 3 {
		return nil, errors.New("malformed api key")
	}
	prefix := strings.Join(parts[:2], "_")
	row, err := m.Queries.GetAPIKeyByPrefix(ctx, prefix)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("unknown api key")
		}
		return nil, err
	}
	if row.RevokedAt.Valid {
		return nil, errors.New("api key revoked")
	}
	sum := sha256.Sum256([]byte(rawKey))
	if subtle.ConstantTimeCompare(row.SecretHash, sum[:]) != 1 {
		return nil, errors.New("invalid api key secret")
	}
	if err := m.Queries.TouchAPIKey(ctx, row.ID); err != nil {
		m.Logger.Warn("failed to touch api key", "error", err)
	}
	projectID := row.ProjectID
	orgID := row.OrganizationID
	apiKeyID := row.ID
	return &models.Actor{
		Type:           models.ActorTypeAPIKey,
		ProjectID:      &projectID,
		OrganizationID: &orgID,
		APIKeyID:       &apiKeyID,
		APIKeyPrefix:   prefix,
	}, nil
}

func PgUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

func HexDigest(input string) string {
	sum := sha256.Sum256([]byte(input))
	return hex.EncodeToString(sum[:])
}
