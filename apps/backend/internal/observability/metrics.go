package observability

import (
	"fmt"
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

// RenderPrometheus emits the collector in Prometheus text exposition format.
// Duration is exposed as sum+count so scrapers can compute real averages.
func (m *Metrics) RenderPrometheus() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return fmt.Sprintf(`# HELP primora_http_requests_total Total HTTP requests handled.
# TYPE primora_http_requests_total counter
primora_http_requests_total %d
# HELP primora_http_request_errors_total HTTP requests that ended in a 5xx response.
# TYPE primora_http_request_errors_total counter
primora_http_request_errors_total %d
# HELP primora_http_active_requests Requests currently in flight.
# TYPE primora_http_active_requests gauge
primora_http_active_requests %d
# HELP primora_http_request_duration_ms_sum Sum of request durations in milliseconds.
# TYPE primora_http_request_duration_ms_sum counter
primora_http_request_duration_ms_sum %d
`,
		m.requestCount, m.errorCount, m.activeRequests, m.totalResponseTime.Milliseconds())
}
