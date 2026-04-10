package observability

import (
	"sync"
	"time"
)

// Metrics provides basic in-memory metrics collection
type Metrics struct {
	mu                sync.RWMutex
	requestCount      int64
	errorCount        int64
	totalResponseTime time.Duration
	activeRequests    int64
}

func NewMetrics() *Metrics {
	return &Metrics{}
}

func (m *Metrics) RecordRequest(duration time.Duration, isError bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.requestCount++
	m.totalResponseTime += duration
	if isError {
		m.errorCount++
	}
}

func (m *Metrics) IncrementActive() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.activeRequests++
}

func (m *Metrics) DecrementActive() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.activeRequests--
}

func (m *Metrics) GetStats() map[string]any {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	avgResponseTime := int64(0)
	if m.requestCount > 0 {
		avgResponseTime = m.totalResponseTime.Milliseconds() / m.requestCount
	}
	
	return map[string]any{
		"total_requests":       m.requestCount,
		"total_errors":         m.errorCount,
		"active_requests":      m.activeRequests,
		"avg_response_time_ms": avgResponseTime,
	}
}
