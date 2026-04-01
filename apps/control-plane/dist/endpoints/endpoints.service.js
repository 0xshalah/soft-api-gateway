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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndpointsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
let EndpointsService = class EndpointsService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async create(dto) {
        const existing = await this.prisma.endpoint.findUnique({
            where: {
                path_method: {
                    path: dto.path,
                    method: dto.method,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Endpoint with path ${dto.path} and method ${dto.method} already exists.`);
        }
        const endpoint = await this.prisma.endpoint.create({
            data: {
                name: dto.name,
                path: dto.path,
                targetUrl: dto.targetUrl,
                method: dto.method,
                upstreamAuth: dto.upstreamAuth,
                rules: {
                    create: {
                        rateLimitRpm: dto.rateLimitRpm ?? 60,
                        retryCount: dto.retryCount ?? 0,
                        backoffMultiplier: dto.backoffMultiplier ?? 1.0,
                    },
                },
            },
            include: {
                rules: true,
            },
        });
        try {
            const publisher = this.redis.getPublisher();
            const redisKey = `endpoint:${dto.path}`;
            await publisher.hset(redisKey, {
                id: endpoint.id,
                targetUrl: dto.targetUrl,
                method: dto.method,
                upstreamAuth: dto.upstreamAuth || '',
                rateLimitRpm: dto.rateLimitRpm ?? 60,
            });
        }
        catch (err) {
            console.error('Failed to sync endpoint to Redis', err);
        }
        return endpoint;
    }
    async findAll() {
        return this.prisma.endpoint.findMany({
            include: {
                rules: true,
            },
        });
    }
    async findOne(id) {
        const endpoint = await this.prisma.endpoint.findUnique({
            where: { id },
            include: {
                rules: true,
            },
        });
        if (!endpoint)
            throw new common_1.NotFoundException('Endpoint not found');
        return endpoint;
    }
    async update(id, dto) {
        const existing = await this.prisma.endpoint.findUnique({
            where: { id },
            include: { rules: true },
        });
        if (!existing)
            throw new common_1.NotFoundException('Endpoint not found');
        const updated = await this.prisma.endpoint.update({
            where: { id },
            data: {
                name: dto.name !== undefined ? dto.name : existing.name,
                path: dto.path !== undefined ? dto.path : existing.path,
                targetUrl: dto.targetUrl !== undefined ? dto.targetUrl : existing.targetUrl,
                method: dto.method !== undefined ? dto.method : existing.method,
                upstreamAuth: dto.upstreamAuth !== undefined ? dto.upstreamAuth : existing.upstreamAuth,
                rules: {
                    updateMany: {
                        where: { endpointId: id },
                        data: {
                            rateLimitRpm: dto.rateLimitRpm !== undefined ? dto.rateLimitRpm : existing.rules[0]?.rateLimitRpm,
                            retryCount: dto.retryCount !== undefined ? dto.retryCount : existing.rules[0]?.retryCount,
                            backoffMultiplier: dto.backoffMultiplier !== undefined ? dto.backoffMultiplier : existing.rules[0]?.backoffMultiplier,
                        },
                    },
                },
            },
            include: { rules: true },
        });
        try {
            const publisher = this.redis.getPublisher();
            if (dto.path && dto.path !== existing.path) {
                await publisher.del(`endpoint:${existing.path}`);
            }
            const redisKey = `endpoint:${updated.path}`;
            await publisher.hset(redisKey, {
                id: updated.id,
                targetUrl: updated.targetUrl,
                method: updated.method,
                upstreamAuth: updated.upstreamAuth || '',
                rateLimitRpm: updated.rules[0]?.rateLimitRpm || 60,
            });
        }
        catch (err) {
            console.error('Failed to update endpoint in Redis', err);
        }
        return updated;
    }
    async remove(id) {
        const endpoint = await this.prisma.endpoint.findUnique({ where: { id } });
        if (!endpoint)
            throw new common_1.NotFoundException('Endpoint not found');
        const result = await this.prisma.endpoint.delete({
            where: { id },
        });
        try {
            const publisher = this.redis.getPublisher();
            await publisher.del(`endpoint:${endpoint.path}`);
        }
        catch (err) {
            console.error('Failed to remove endpoint from Redis', err);
        }
        return result;
    }
};
exports.EndpointsService = EndpointsService;
exports.EndpointsService = EndpointsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], EndpointsService);
//# sourceMappingURL=endpoints.service.js.map