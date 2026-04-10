package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// StructuredLogger returns a middleware that logs HTTP requests with structured logging
func StructuredLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		req := c.Request

		// Create a logger with request context
		logger := log.With().
			Str("method", req.Method).
			Str("uri", req.RequestURI).
			Str("remote_ip", c.ClientIP()).
			Str("user_agent", req.UserAgent()).
			Str("request_id", req.Header.Get("X-Request-ID")).
			Logger()

		// Add logger to context
		c.Set("logger", &logger)

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Log the request
		logEvent := logger.Info()
		if len(c.Errors) > 0 {
			logEvent = logger.Error().Err(c.Errors.Last())
		}

		logEvent.
			Int("status", c.Writer.Status()).
			Int64("bytes_out", int64(c.Writer.Size())).
			Dur("latency_ms", latency).
			Msg("HTTP request")
	}
}

// GetLogger retrieves the logger from the Gin context
func GetLogger(c *gin.Context) *zerolog.Logger {
	if logger, exists := c.Get("logger"); exists {
		if l, ok := logger.(*zerolog.Logger); ok {
			return l
		}
	}
	return &log.Logger
}