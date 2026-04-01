package proxy

import (
	"fmt"
	"strconv"
	"time"

	"data-plane/internal/platform/redis"
)

// CheckRateLimit implements a Fixed Window rate limiting algorithm natively on Redis.
func CheckRateLimit(clientIP string, endpointPath string, maxRpmStr string) bool {
	maxRpm, err := strconv.Atoi(maxRpmStr)
	if err != nil || maxRpm <= 0 {
		return true // By default, allow if no valid limit is set
	}

	key := fmt.Sprintf("ratelimit:%s:%s", endpointPath, clientIP)

	// INCR automatically creates the key if it doesn't exist
	currentStr, err := redis.Client.Incr(redis.Ctx, key).Result()
	if err != nil {
		fmt.Printf("[RateLimit] Error executing INCR: %v\n", err)
		return true // Fail open pattern to not block valid traffic on metrics failure
	}

	// If this is the first hit in the window, set the TTL to 60 seconds (1 minute window)
	if currentStr == 1 {
		redis.Client.Expire(redis.Ctx, key, time.Minute)
	}

	if currentStr > int64(maxRpm) {
		return false // Request blocked
	}

	return true
}
