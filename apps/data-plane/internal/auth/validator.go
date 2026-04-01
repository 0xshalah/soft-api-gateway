package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"

	"data-plane/internal/platform/redis"
)

type KeyMetadata struct {
	Hash       string   `json:"hash"`
	Scopes     []string `json:"scopes"`
	EndpointID string   `json:"endpoint_id"`
}

func ValidateKey(token string) (*KeyMetadata, error) {
	if !strings.HasPrefix(token, "sk_live_") {
		return nil, fmt.Errorf("invalid token format")
	}

	// 1. Prefix Lookup (15 chars)
	prefix := token[:15]
	key := fmt.Sprintf("key_prefix:%s", prefix)

	// 2. Fetch from Redis
	fields, err := redis.Client.HGetAll(redis.Ctx, key).Result()
	if err != nil {
		return nil, fmt.Errorf("redis lookup failed: %w", err)
	}

	if len(fields) == 0 {
		return nil, fmt.Errorf("unknown key prefix")
	}

	// 3. Hash Verification
	hash := sha256.Sum256([]byte(token))
	providedHash := hex.EncodeToString(hash[:])

	if providedHash != fields["hash"] {
		return nil, fmt.Errorf("invalid key hash")
	}

	return &KeyMetadata{
		Hash:       fields["hash"],
		Scopes:     strings.Split(fields["scopes"], ","),
		EndpointID: fields["endpoint_id"],
	}, nil
}
