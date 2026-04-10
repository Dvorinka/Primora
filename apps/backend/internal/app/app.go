package app

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	"github.com/tdvorak/primora/apps/backend/internal/auth"
	"github.com/tdvorak/primora/apps/backend/internal/config"
	"github.com/tdvorak/primora/apps/backend/internal/database"
	"github.com/tdvorak/primora/apps/backend/internal/handlers"
	"github.com/tdvorak/primora/apps/backend/internal/middleware"
	"github.com/tdvorak/primora/apps/backend/internal/observability"
	"github.com/tdvorak/primora/apps/backend/internal/repositories"
	"github.com/tdvorak/primora/apps/backend/internal/services"
	"github.com/tdvorak/primora/apps/backend/internal/storage"
)

type App struct {
	Config config.Config
	Router *gin.Engine
	Logger *slog.Logger
	DB     *pgxpool.Pool
	Redis  *redis.Client
}

func Bootstrap(ctx context.Context) (*App, error) {
	_ = godotenv.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	dbPool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	if err := database.RunMigrationsFromPool(dbPool, database.ResolveMigrationsDir(), logger); err != nil {
		return nil, err
	}
	var verifier *auth.Verifier
	for attempt := 1; attempt <= 20; attempt++ {
		verifier, err = auth.NewVerifier(ctx, cfg.AuthInternalBaseURL+"/auth/jwks", cfg.JWTIssuer, cfg.JWTAudience)
		if err == nil {
			break
		}
		logger.Warn("auth jwks unavailable, retrying", "attempt", attempt, "error", err)
		time.Sleep(2 * time.Second)
	}
	if verifier == nil {
		return nil, err
	}

	var redisClient *redis.Client
	if options, err := redis.ParseURL(cfg.DragonflyURL); err != nil {
		logger.Warn("dragonfly configuration invalid, continuing in degraded mode", "error", err)
	} else {
		redisClient = redis.NewClient(options)
		if err := redisClient.Ping(ctx).Err(); err != nil {
			logger.Warn("dragonfly unavailable, continuing in degraded mode", "error", err)
			redisClient = nil
		}
	}

	store, err := storage.NewLocalStore(cfg.StorageRoot)
	if err != nil {
		return nil, err
	}
	repo := repositories.NewCoreRepository(dbPool)
	platform := services.NewPlatformService(repo, store, services.NewMailer(cfg), os.Getenv("VITE_APP_URL"))

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.RequestID())
	router.Use(middleware.Logger(logger))
	
	metrics := observability.NewMetrics()
	router.Use(middleware.Metrics(metrics))
	router.Use(middleware.Compression())
	
	// CORS configuration - update AllowedOrigins for production
	corsOrigins := []string{cfg.PublicURL}
	if cfg.Env == "development" {
		corsOrigins = append(corsOrigins, "http://localhost", "http://localhost:3000")
	}
	router.Use(middleware.CORS(middleware.CORSConfig{
		AllowedOrigins: corsOrigins,
	}))
	
	router.Use(middleware.AuthMiddleware{
		Queries:  repo,
		Logger:   logger,
		Redis:    redisClient,
		Verifier: verifier,
		RateLimits: middleware.RateLimitConfig{
			APIKeyPerMinute: cfg.APIKeyRateLimitPerMin,
			UserPerMinute:   cfg.UserRateLimitPerMin,
		},
	}.ResolveActor())

	handler := &handlers.HTTPHandler{
		Platform: platform,
		Validate: validator.New(),
		Metrics:  metrics,
		Readiness: func(c *gin.Context) map[string]any {
			status := map[string]any{
				"status": "ok",
				"checks": map[string]any{
					"database":  "ok",
					"storage":   "ok",
					"dragonfly": "ok",
				},
				"metrics": metrics.GetStats(),
			}
			if err := dbPool.Ping(c.Request.Context()); err != nil {
				status["status"] = "degraded"
				status["checks"].(map[string]any)["database"] = err.Error()
			}
			if redisClient != nil {
				if err := redisClient.Ping(c.Request.Context()).Err(); err != nil {
					status["status"] = "degraded"
					status["checks"].(map[string]any)["dragonfly"] = err.Error()
				}
			} else {
				status["status"] = "degraded"
				status["checks"].(map[string]any)["dragonfly"] = "disabled"
			}
			return status
		},
	}
	handler.Register(router)

	return &App{
		Config: cfg,
		Router: router,
		Logger: logger,
		DB:     dbPool,
		Redis:  redisClient,
	}, nil
}

func (a *App) Run() error {
	address := ":" + a.Config.ServerPort
	a.Logger.Info("primora backend starting", "address", address)
	return a.Router.Run(address)
}

func (a *App) Close() error {
	if a.Redis != nil {
		if err := a.Redis.Close(); err != nil {
			return fmt.Errorf("close redis: %w", err)
		}
	}
	a.DB.Close()
	return nil
}
