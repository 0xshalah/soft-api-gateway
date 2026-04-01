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
var HealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
let HealthService = HealthService_1 = class HealthService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(HealthService_1.name);
    }
    async checkAllEndpointsUptime() {
        this.logger.debug('Running active health checks for all endpoints...');
        try {
            const endpoints = await this.prisma.$queryRawUnsafe('SELECT id, target_url as "targetUrl", method FROM endpoints');
            for (const endpoint of endpoints) {
                let status = 'Active';
                try {
                    const startTime = Date.now();
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);
                    const callMethod = endpoint.method === 'ALL' ? 'GET' : endpoint.method;
                    const res = await fetch(endpoint.targetUrl, {
                        method: callMethod,
                        headers: { 'User-Agent': 'SoftAnalytics-Health-Prober/1.0' },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    const latency = Date.now() - startTime;
                    if (latency > 1500) {
                        status = 'Degraded';
                    }
                    if (!res.ok && res.status >= 500) {
                        status = 'Degraded';
                    }
                }
                catch (error) {
                    status = 'Down';
                }
                await this.prisma.$executeRaw `UPDATE endpoints SET status = ${status}, last_health_check = NOW() WHERE id = ${endpoint.id}::uuid`;
            }
            this.logger.debug('Active health checks completed.');
        }
        catch (err) {
            this.logger.error('Sistem deteksi Uptime gagal terhubung ke database Postgres: ' + err.message);
        }
    }
};
exports.HealthService = HealthService;
__decorate([
    (0, schedule_1.Cron)('*/30 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthService.prototype, "checkAllEndpointsUptime", null);
exports.HealthService = HealthService = HealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HealthService);
//# sourceMappingURL=health.service.js.map