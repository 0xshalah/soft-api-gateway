"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var KeysService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeysService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const crypto_1 = require("crypto");
const KEY_CACHE_TTL_SECONDS = 60 * 60 * 24 * 90;
let KeysService = KeysService_1 = class KeysService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
        this.logger = new common_1.Logger(KeysService_1.name);
    }
    async create(dto) {
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const secretKey = `sk_live_${token}`;
        const prefix = secretKey.substring(0, 15);
        const hash = (0, crypto_1.createHash)('sha256').update(secretKey).digest('hex');
        const keyRecord = await this.prisma.key.create({
            data: {
                name: dto.name,
                prefix,
                hash,
                scopes: dto.scopes,
                createdBy: dto.userId,
            },
        });
        await this.syncKeyToRedis(prefix, hash, dto.scopes, keyRecord.id);
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
    async findOne(id) {
        const key = await this.prisma.key.findUnique({
            where: { id },
            include: { creator: true },
        });
        if (!key)
            throw new common_1.NotFoundException('Key not found');
        return key;
    }
    async revoke(id) {
        const key = await this.prisma.key.update({
            where: { id },
            data: { status: 'Revoked' },
        });
        await this.purgeKeyFromRedis(key.prefix);
        return key;
    }
    async syncKeyToRedis(prefix, hash, scopes, keyId) {
        const redisKey = `key_prefix:${prefix}`;
        try {
            const publisher = this.redis.getPublisher();
            await publisher.hset(redisKey, {
                hash,
                scopes: scopes.join(','),
                key_id: keyId,
                status: 'active',
            });
            await publisher.expire(redisKey, KEY_CACHE_TTL_SECONDS);
            this.logger.log(`Redis cache synced for prefix: ${prefix}`);
        }
        catch (err) {
            this.logger.error(`Failed to sync key prefix ${prefix} to Redis: ${err.message}. ` +
                `The key is persisted in PostgreSQL but Data Plane auth will fail until Redis is populated.`);
        }
    }
    async purgeKeyFromRedis(prefix) {
        const redisKey = `key_prefix:${prefix}`;
        try {
            const publisher = this.redis.getPublisher();
            await publisher.del(redisKey);
            this.logger.log(`Redis cache purged for revoked prefix: ${prefix}`);
        }
        catch (err) {
            this.logger.error(`Failed to purge Redis key ${redisKey}: ${err.message}. ` +
                `Manual cleanup may be required to prevent unauthorized access.`);
        }
    }
};
exports.KeysService = KeysService;
exports.KeysService = KeysService = KeysService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], KeysService);
//# sourceMappingURL=keys.service.js.map