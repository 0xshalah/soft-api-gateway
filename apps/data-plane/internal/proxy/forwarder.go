package proxy

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/sony/gobreaker"
)

var (
	cb *gobreaker.CircuitBreaker
)

func InitCB() {
	st := gobreaker.Settings{
		Name:        "API-Gateway-Proxy",
		MaxRequests: 3,
		Interval:    30 * time.Second,
		Timeout:     30 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 5 && failureRatio >= 0.6
		},
	}
	cb = gobreaker.NewCircuitBreaker(st)
}

func ForwardRequest(method, targetURL string, body []byte, headers map[string][]string) (*http.Response, error) {
	// 1. Wrap with Circuit Breaker
	result, err := cb.Execute(func() (interface{}, error) {
		client := &http.Client{
			Timeout: 5 * time.Second,
		}

		// 2. Prepare request
		var bodyReader io.Reader
		if body != nil {
			bodyReader = bytes.NewReader(body)
		}

		proxyReq, err := http.NewRequest(method, targetURL, bodyReader)
		if err != nil {
			return nil, err
		}

		// 3. Copy headers
		for name, values := range headers {
			for _, value := range values {
				proxyReq.Header.Add(name, value)
			}
		}

		// 4. Do request
		resp, err := client.Do(proxyReq)
		if err != nil {
			return nil, err
		}

		if resp.StatusCode >= 500 {
			return resp, fmt.Errorf("upstream server error: %d", resp.StatusCode)
		}

		return resp, nil
	})

	if err != nil {
		return nil, err
	}

	return result.(*http.Response), nil
}
