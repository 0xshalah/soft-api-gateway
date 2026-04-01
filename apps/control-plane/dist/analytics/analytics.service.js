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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    constructor(redis, prisma) {
        this.redis = redis;
        this.prisma = prisma;
    }
    async getGlobalOverview() {
        const publisher = this.redis.getPublisher();
        const reqStr = await publisher.get('global:requests');
        const totalReqs = parseInt(reqStr || '0', 10);
        const latStr = await publisher.get('global:latency_sum');
        const latSum = parseInt(latStr || '0', 10);
        const avgLatency = totalReqs > 0 ? Math.round(latSum / totalReqs) : 0;
        const trafficHash = (await publisher.hgetall('global:traffic_curve')) || {};
        const currentMin = Math.floor(Date.now() / 60000);
        const trafficData = [];
        for (let i = 44; i >= 0; i--) {
            const bucket = currentMin - i;
            const vol = parseInt(trafficHash[bucket.toString()] || '0', 10);
            trafficData.push(vol);
        }
        const hasData = trafficData.some(v => v > 0);
        if (!hasData) {
            for (let i = 0; i < trafficData.length; i++)
                trafficData[i] = 1;
        }
        const endpoints = await this.prisma.$queryRawUnsafe('SELECT status FROM endpoints');
        let upCount = 0;
        endpoints.forEach(ep => {
            if (ep.status === 'Active' || ep.status === 'Degraded')
                upCount++;
        });
        const uptimePercent = endpoints.length > 0 ? ((upCount / endpoints.length) * 100).toFixed(2) : '100.00';
        const formatNumber = (num) => {
            if (num >= 1000000)
                return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000)
                return (num / 1000).toFixed(1) + 'k';
            return num.toString();
        };
        return {
            totalRequests: formatNumber(totalReqs),
            rawTotalRequests: totalReqs,
            avgLatency: `${avgLatency}ms`,
            systemUptime: `${uptimePercent}%`,
            trafficChart: trafficData
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map