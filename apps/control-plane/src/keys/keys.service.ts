import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateKeyDto } from './dto/create-key.dto';
import { createHash, randomBytes } from 'crypto';

// Redis key TTL: 90 days (in seconds).
// Re-creation on key revocation will naturally overwrite.
const KEY_CACHE_TTL_SECONDS = 60 * 60 * 24 * 90;

@Injectable()
export class KeysService {
  private readonly logger = new Logger(KeysService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(dto: CreateKeyDto) {
    // 1. Generate cryptographically secure random token
    const token = randomBytes(32).toString('hex');
    const secretKey = `sk_live_${token}`;

    // 2. Extract prefix (first 15 chars: "sk_live_" + 7 chars of token)
    const prefix = secretKey.substring(0, 15);

    // 3. SHA-256 hash — the ONLY representation stored permanently
    const hash = createHash('sha256').update(secretKey).digest('hex');

    // 4. Persist to PostgreSQL (source of truth for config)
    const keyRecord = await this.prisma.key.create({
      data: {
        name: dto.name,
        prefix,
        hash,
        scopes: dto.scopes,
        createdBy: dto.userId,
      },
    });

    // 5. Sync lookup cache to Redis for the Data Plane validator
    //    This is the bridge that enables Go's validator.go to authenticate tokens.
    await this.syncKeyToRedis(prefix, hash, dto.scopes, keyRecord.id);

    // 6. Return plain-text secretKey ONLY ONCE — never stored in cleartext
    return {
      ...keyRecord,
      secretKey,
    };
  }

  async findAll() {
    return this.prisma.key.findMany({
      include: { creator: true },
    });
  }

  async findOne(id: string) {
    const key = await this.prisma.key.findUnique({
      where: { id },
      include: { creator: true },
    });
    if (!key) throw new NotFoundException('Key not found');
    return key;
  }

  async revoke(id: string) {
    const key = await this.prisma.key.update({
      where: { id },
      data: { status: 'Revoked' },
    });

    // Invalidate the Redis cache immediately so the Data Plane stops accepting it
    await this.purgeKeyFromRedis(key.prefix);

    return key;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: Redis sync helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async syncKeyToRedis(
    prefix: string,
    hash: string,
    scopes: string[],
    keyId: string,
  ): Promise<void> {
    const redisKey = `key_prefix:${prefix}`;
    try {
      const publisher = this.redis.getPublisher();

      // HSET stores all fields atomically
      await publisher.hset(redisKey, {
        hash,
        scopes: scopes.join(','),
        key_id: keyId,
        status: 'active',
      });

      // Set TTL to prevent stale cache accumulation
      await publisher.expire(redisKey, KEY_CACHE_TTL_SECONDS);

      this.logger.log(`Redis cache synced for prefix: ${prefix}`);
    } catch (err) {
      // Non-fatal: log the failure but do NOT roll back the DB write.
      // The key is valid in Postgres; Redis can be re-synced via admin tooling.
      this.logger.error(
        `Failed to sync key prefix ${prefix} to Redis: ${err.message}. ` +
          `The key is persisted in PostgreSQL but Data Plane auth will fail until Redis is populated.`,
      );
    }
  }

  private async purgeKeyFromRedis(prefix: string): Promise<void> {
    const redisKey = `key_prefix:${prefix}`;
    try {
      const publisher = this.redis.getPublisher();
      await publisher.del(redisKey);
      this.logger.log(`Redis cache purged for revoked prefix: ${prefix}`);
    } catch (err) {
      this.logger.error(
        `Failed to purge Redis key ${redisKey}: ${err.message}. ` +
          `Manual cleanup may be required to prevent unauthorized access.`,
      );
    }
  }
}
