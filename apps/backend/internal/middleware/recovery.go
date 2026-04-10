package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

// Recovery returns a middleware that recovers from panics
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				err, ok := r.(error)
				if !ok {
					err = fmt.Errorf("%v", r)
				}

				// Log the panic with stack trace
				log.Error().
					Err(err).
					Str("stack", string(debug.Stack())).
					Str("method", c.Request.Method).
					Str("uri", c.Request.RequestURI).
					Str("remote_ip", c.ClientIP()).
					Msg("Panic recovered")

				// Return internal server error
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			}
		}()

		c.Next()
	}
}