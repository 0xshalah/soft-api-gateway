package proxy

import (
	"encoding/json"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"data-plane/internal/platform/redis"
)

type TrafficLog struct {
	ID             string    `json:"id"`
	Timestamp      time.Time `json:"timestamp"`
	EndpointID     string    `json:"endpoint_id"`
	StatusCode     int       `json:"status_code"`
	LatencyMS      int64     `json:"latency_ms"`
	Method         string    `json:"method"`
	Path           string    `json:"path"`
	PayloadPreview string    `json:"payload_preview"`
}

func LogTraffic(logEntry *TrafficLog) {
	// Execute in a separate goroutine to ensure non-blocking behavior
	go func() {
		data, err := json.Marshal(logEntry)
		if err != nil {
			fmt.Printf("failed to marshal log entry: %v\n", err)
			return
		}

		// Push to Redis Stream
		err = redis.Client.XAdd(redis.Ctx, &goredis.XAddArgs{
			Stream: "traffic_logs_stream",
			Values: map[string]interface{}{
				"payload": string(data),
			},
		}).Err()

		if err != nil {
			fmt.Printf("failed to push log to redis stream: %v\n", err)
		}
	}()
}
