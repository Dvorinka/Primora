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
