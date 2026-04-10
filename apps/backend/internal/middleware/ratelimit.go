package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implements a simple token bucket rate limiter
type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	rate     int           // requests per window
	window   time.Duration // time window
}

type visitor struct {
	tokens   int
	lastSeen time.Time
	mu       sync.Mutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate,
		window:   window,
	}

	// Cleanup old visitors every minute
	go rl.cleanupVisitors()

	return rl
}

// Middleware returns a Gin middleware function
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		if !rl.allow(ip) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded"})
			return
		}

		c.Next()
	}
}

// allow checks if a request from the given IP is allowed
func (rl *RateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	v, exists := rl.visitors[ip]
	if !exists {
		v = &visitor{
			tokens:   rl.rate,
			lastSeen: time.Now(),
		}
		rl.visitors[ip] = v
	}
	rl.mu.Unlock()

	v.mu.Lock()
	defer v.mu.Unlock()

	// Refill tokens based on time passed
	now := time.Now()
	elapsed := now.Sub(v.lastSeen)
	v.lastSeen = now

	// Add tokens based on elapsed time
	tokensToAdd := int(elapsed / rl.window * time.Duration(rl.rate))
	v.tokens += tokensToAdd
	if v.tokens > rl.rate {
		v.tokens = rl.rate
	}

	// Check if we have tokens available
	if v.tokens > 0 {
		v.tokens--
		return true
	}

	return false
}

// cleanupVisitors removes old visitors periodically
func (rl *RateLimiter) cleanupVisitors() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			v.mu.Lock()
			if time.Since(v.lastSeen) > rl.window*2 {
				delete(rl.visitors, ip)
			}
			v.mu.Unlock()
		}
		rl.mu.Unlock()
	}
}

// RateLimitByKey implements rate limiting by custom key (e.g., user ID, API key)
type KeyRateLimiter struct {
	limiters map[string]*RateLimiter
	mu       sync.RWMutex
	rate     int
	window   time.Duration
}

// NewKeyRateLimiter creates a new key-based rate limiter
func NewKeyRateLimiter(rate int, window time.Duration) *KeyRateLimiter {
	return &KeyRateLimiter{
		limiters: make(map[string]*RateLimiter),
		rate:     rate,
		window:   window,
	}
}

// Middleware returns a Gin middleware function that rate limits by a custom key
func (krl *KeyRateLimiter) Middleware(keyFunc func(*gin.Context) string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := keyFunc(c)
		if key == "" {
			c.Next()
			return
		}

		krl.mu.RLock()
		limiter, exists := krl.limiters[key]
		krl.mu.RUnlock()

		if !exists {
			krl.mu.Lock()
			limiter = NewRateLimiter(krl.rate, krl.window)
			krl.limiters[key] = limiter
			krl.mu.Unlock()
		}

		if !limiter.allow(key) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded for this resource"})
			return
		}

		c.Next()
	}
}