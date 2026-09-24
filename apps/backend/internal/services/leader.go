package services

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Leader election via Postgres advisory locks. The lock is session-scoped, so
// the lease pins its pool connection for its entire lifetime — a handoff back
// to the pool would silently drop it. A single-replica deployment simply
// always holds the lock; there is no feature flag.
//
// Distinct keys per component so the job scheduler and the alert evaluator
// elect independently.
const (
	leaderKeyScheduler int64 = 728201
	leaderKeyAlerts    int64 = 728202
)

type leaderLease struct {
	conn *pgxpool.Conn
	key  int64
}

// acquireLeadership returns a lease when this process wins the lock, nil when
// another replica holds it, or an error when the check itself failed.
func acquireLeadership(ctx context.Context, pool *pgxpool.Pool, key int64) (*leaderLease, error) {
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return nil, err
	}
	var got bool
	if err := conn.QueryRow(ctx, "SELECT pg_try_advisory_lock($1)", key).Scan(&got); err != nil {
		conn.Release()
		return nil, err
	}
	if !got {
		conn.Release()
		return nil, nil
	}
	return &leaderLease{conn: conn, key: key}, nil
}

// alive pings the pinned connection — a dead conn means Postgres dropped the
// session and released the lock, so leadership is lost even though the lease
// object still exists.
func (l *leaderLease) alive(ctx context.Context) bool {
	var one int
	return l.conn.QueryRow(ctx, "SELECT 1").Scan(&one) == nil
}

func (l *leaderLease) release(ctx context.Context) {
	_, _ = l.conn.Exec(ctx, "SELECT pg_advisory_unlock($1)", l.key)
	l.conn.Release()
}

// leaderState tracks a lease inside a ticker loop — acquire when absent,
// verify when held, drop and re-elect when the connection dies.
type leaderState struct {
	pool  *pgxpool.Pool
	key   int64
	lease *leaderLease
}

func newLeaderState(pool *pgxpool.Pool, key int64) *leaderState {
	return &leaderState{pool: pool, key: key}
}

// hold reports whether this process currently leads. A nil pool means no
// election configured (tests, embedded use) — always lead.
func (l *leaderState) hold(ctx context.Context) bool {
	if l == nil || l.pool == nil {
		return true
	}
	if l.lease != nil {
		if l.lease.alive(ctx) {
			return true
		}
		l.lease.release(ctx)
		l.lease = nil
	}
	lease, err := acquireLeadership(ctx, l.pool, l.key)
	if err != nil {
		return false
	}
	l.lease = lease
	return lease != nil
}

func (l *leaderState) stop(ctx context.Context) {
	if l != nil && l.lease != nil {
		l.lease.release(ctx)
		l.lease = nil
	}
}


