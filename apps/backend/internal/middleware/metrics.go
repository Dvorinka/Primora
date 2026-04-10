package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tdvorak/primora/apps/backend/internal/observability"
)

func Metrics(metrics *observability.Metrics) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		metrics.IncrementActive()
		defer metrics.DecrementActive()

		c.Next()

		duration := time.Since(start)
		isError := c.Writer.Status() >= 400
		metrics.RecordRequest(duration, isError)
	}
}
