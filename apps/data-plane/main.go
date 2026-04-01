package main

import (
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"time"

	"data-plane/internal/auth"
	"data-plane/internal/platform/redis"
	"data-plane/internal/proxy"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// 1. Initialize Redis
	if err := redis.Init(); err != nil {
		log.Printf("[WARNING] Redis not connected: %v. Running in degraded mode.\n", err)
	}

	// 2. Initialize Circuit Breaker
	proxy.InitCB()

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, HEAD, PUT, DELETE, PATCH, OPTIONS",
	}))

	// Health Checks
	app.Get("/health", func(c *fiber.Ctx) error { return c.SendString("OK") })
	app.Get("/ready", func(c *fiber.Ctx) error { return c.SendString("Ready") })

	// Proxy Logic
	app.All("/proxy/*", func(c *fiber.Ctx) error {
		start := time.Now()

		// 1. Extract Token
		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing or invalid token"})
		}
		token := authHeader[7:]

		// 2. Validate Key (Internal Auth)
		metadata, err := auth.ValidateKey(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid API Key", "details": err.Error()})
		}

		// 3. Dynamic Target Routing (Mock removed for MVP Phase 3)
		reqPath := "/" + c.Params("*")
		redisKey := fmt.Sprintf("endpoint:%s", reqPath)
		fields, err := redis.Client.HGetAll(redis.Ctx, redisKey).Result()
		
		if err != nil || len(fields) == 0 {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Endpoint not registered or missing in cache"})
		}

		if c.Method() != fields["method"] && fields["method"] != "ALL" {
			return c.Status(fiber.StatusMethodNotAllowed).JSON(fiber.Map{"error": "Method not allowed for this endpoint"})
		}

		targetURL := fields["targetUrl"]
		metadata.EndpointID = fields["id"]

		// 3.5 Check Rate Limits
		rateLimitRpm := fields["rateLimitRpm"]
		clientIP := c.IP()
		if !proxy.CheckRateLimit(clientIP, reqPath, rateLimitRpm) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Rate limit exceeded. Please slow down.",
			})
		}

		// 4. Forward Request (with Circuit Breaker)
		reqHeaders := make(map[string][]string)
		c.Request().Header.VisitAll(func(key []byte, value []byte) {
			k := string(key)
			// STRIP the client's Authorization header so we don't leak it upstream!
			if strings.EqualFold(k, "Authorization") {
				return
			}
			reqHeaders[k] = append(reqHeaders[k], string(value))
		})

		// A. INJECT UPSTREAM AUTH automatically if present in Database/Redis
		upstreamAuth := fields["upstreamAuth"]
		if upstreamAuth != "" {
			reqHeaders["Authorization"] = []string{upstreamAuth}
		}
		resp, err := proxy.ForwardRequest(c.Method(), targetURL, c.Body(), reqHeaders)
		if err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Gateway Error / Circuit Open"})
		}
		defer resp.Body.Close()

		// 5. Async Logging
		latency := time.Since(start).Milliseconds()
		proxy.LogTraffic(&proxy.TrafficLog{
			Timestamp:  time.Now(),
			EndpointID: metadata.EndpointID,
			StatusCode: resp.StatusCode,
			LatencyMS:  latency,
			Method:     c.Method(),
			Path:       c.Path(),
		})

		// 6. Return response
		c.Status(resp.StatusCode)
		for k, vv := range resp.Header {
			for _, v := range vv {
				c.Set(k, v)
			}
		}
		
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read upstream response"})
		}
		return c.Send(body)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	log.Fatal(app.Listen(":" + port))
}
