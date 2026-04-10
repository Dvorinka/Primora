package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func Abort(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{
		"error": gin.H{
			"code":    code,
			"message": message,
		},
		"status": http.StatusText(status),
	})
}
