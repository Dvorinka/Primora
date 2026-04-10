package services

import (
	"context"
	"database/sql"
	"time"
)

// HealthService provides health check functionality
type HealthService struct {
	db *sql.DB
}

// NewHealthService creates a new health service
func NewHealthService(db *sql.DB) *HealthService {
	return &HealthService{
		db: db,
	}
}

// HealthStatus represents the health status of the application
type HealthStatus struct {
	Status    string                 `json:"status"`
	Timestamp time.Time              `json:"timestamp"`
	Version   string                 `json:"version"`
	Checks    map[string]CheckResult `json:"checks"`
}

// CheckResult represents the result of a health check
type CheckResult struct {
	Status  string        `json:"status"`
	Message string        `json:"message,omitempty"`
	Latency time.Duration `json:"latency_ms"`
}

// Check performs all health checks
func (hs *HealthService) Check(ctx context.Context, version string) HealthStatus {
	status := HealthStatus{
		Status:    "healthy",
		Timestamp: time.Now(),
		Version:   version,
		Checks:    make(map[string]CheckResult),
	}

	// Database check
	dbCheck := hs.checkDatabase(ctx)
	status.Checks["database"] = dbCheck
	if dbCheck.Status != "healthy" {
		status.Status = "unhealthy"
	}

	// Add more checks as needed
	status.Checks["api"] = CheckResult{
		Status:  "healthy",
		Message: "API is responding",
		Latency: 0,
	}

	return status
}

// checkDatabase checks database connectivity
func (hs *HealthService) checkDatabase(ctx context.Context) CheckResult {
	start := time.Now()
	
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err := hs.db.PingContext(ctx)
	latency := time.Since(start)

	if err != nil {
		return CheckResult{
			Status:  "unhealthy",
			Message: err.Error(),
			Latency: latency,
		}
	}

	return CheckResult{
		Status:  "healthy",
		Message: "Database connection successful",
		Latency: latency,
	}
}

// Readiness checks if the service is ready to accept traffic
func (hs *HealthService) Readiness(ctx context.Context) bool {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	err := hs.db.PingContext(ctx)
	return err == nil
}

// Liveness checks if the service is alive
func (hs *HealthService) Liveness(ctx context.Context) bool {
	// Simple check - if we can execute this, we're alive
	return true
}
