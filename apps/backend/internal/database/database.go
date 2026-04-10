package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	var lastErr error
	for attempt := 1; attempt <= 20; attempt++ {
		config, err := pgxpool.ParseConfig(databaseURL)
		if err != nil {
			return nil, fmt.Errorf("parse database config: %w", err)
		}

		config.MaxConnLifetime = 30 * time.Minute
		config.MaxConns = 20
		config.MinConns = 2

		pool, err := pgxpool.NewWithConfig(ctx, config)
		if err != nil {
			lastErr = fmt.Errorf("create pool: %w", err)
		} else if err := pool.Ping(ctx); err != nil {
			pool.Close()
			lastErr = fmt.Errorf("ping database: %w", err)
		} else {
			return pool, nil
		}

		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
	return nil, lastErr
}

func RunMigrations(databaseURL, migrationsDir string, logger *slog.Logger) error {
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set goose dialect: %w", err)
	}
	sqlDB, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("open sql db: %w", err)
	}
	defer sqlDB.Close()

	if err := goose.Up(sqlDB, migrationsDir); err != nil {
		return fmt.Errorf("goose up: %w", err)
	}
	logger.Info("database migrations complete", "dir", migrationsDir)
	return nil
}

func RunMigrationsFromPool(pool *pgxpool.Pool, migrationsDir string, logger *slog.Logger) error {
	sqlDB := stdlib.OpenDBFromPool(pool)
	defer sqlDB.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set goose dialect: %w", err)
	}
	if err := goose.Up(sqlDB, migrationsDir); err != nil {
		return fmt.Errorf("goose up: %w", err)
	}
	logger.Info("database migrations complete", "dir", migrationsDir)
	return nil
}

func ResolveMigrationsDir() string {
	if dir := os.Getenv("BACKEND_MIGRATIONS_DIR"); dir != "" {
		return dir
	}
	return filepath.Join("db", "migrations")
}
