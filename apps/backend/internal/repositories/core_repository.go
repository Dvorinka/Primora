package repositories

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
)

type CoreRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewCoreRepository(pool *pgxpool.Pool) *CoreRepository {
	return &CoreRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *CoreRepository) Queries() *db.Queries {
	return r.queries
}

// Pool exposes the pgx pool for dynamic queries sqlc can't express
// (PostgREST-style document filtering builds its WHERE clause at runtime).
func (r *CoreRepository) Pool() *pgxpool.Pool {
	return r.pool
}

func (r *CoreRepository) WithTx(ctx context.Context, fn func(*db.Queries) error) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()
	if err := fn(r.queries.WithTx(tx)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *CoreRepository) UpsertUser(ctx context.Context, params db.UpsertUserParams) (db.CoreUser, error) {
	return r.queries.UpsertUser(ctx, params)
}

func (r *CoreRepository) CountOrganizations(ctx context.Context) (int64, error) {
	return r.queries.CountOrganizations(ctx)
}

func (r *CoreRepository) GetAPIKeyByPrefix(ctx context.Context, prefix string) (db.GetAPIKeyByPrefixRow, error) {
	return r.queries.GetAPIKeyByPrefix(ctx, prefix)
}

func (r *CoreRepository) TouchAPIKey(ctx context.Context, id uuid.UUID) error {
	return r.queries.TouchAPIKey(ctx, id)
}

// Auth-user lookups hit the better-auth tables in the public schema. They are
// raw queries on purpose: sqlc only knows the core schema, and a view would
// break when the backend migrates before the auth service has created its
// tables.
func (r *CoreRepository) GetAuthUserRole(ctx context.Context, authSubject string) (string, error) {
	var role string
	err := r.pool.QueryRow(ctx, `select coalesce(role, 'user') from public."user" where id = $1`, authSubject).Scan(&role)
	return role, err
}

func (r *CoreRepository) CountAuthUsers(ctx context.Context) (int64, error) {
	var n int64
	err := r.pool.QueryRow(ctx, `select count(*) from public."user"`).Scan(&n)
	return n, err
}

func (r *CoreRepository) GetSetting(ctx context.Context, key string) (db.GetSettingRow, error) {
	return r.queries.GetSetting(ctx, key)
}

func (r *CoreRepository) ListSettings(ctx context.Context) ([]db.ListSettingsRow, error) {
	return r.queries.ListSettings(ctx)
}

func (r *CoreRepository) UpsertSetting(ctx context.Context, params db.UpsertSettingParams) (db.CoreSetting, error) {
	return r.queries.UpsertSetting(ctx, params)
}

func (r *CoreRepository) DeleteSetting(ctx context.Context, key string) error {
	return r.queries.DeleteSetting(ctx, key)
}
