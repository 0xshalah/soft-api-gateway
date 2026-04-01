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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LogsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const redis_service_1 = require("../redis/redis.service");
const common_1 = require("@nestjs/common");
const STREAM_KEY = 'traffic_logs_stream';
const HEARTBEAT_INTERVAL_MS = 30_000;
const THROTTLE_INTERVAL_MS = 250;
let LogsGateway = LogsGateway_1 = class LogsGateway {
    constructor(redisService) {
        this.redisService = redisService;
        this.logger = new common_1.Logger(LogsGateway_1.name);
        this.subscriptions = new Map();
        this.logBuffer = new Map();
        this.lastStreamId = '$';
    }
    afterInit() {
        this.logger.log('LogsGateway initialized on namespace /logs');
        this.startStreamReader();
        this.flushTimer = setInterval(() => {
            this.flushBuffers();
        }, THROTTLE_INTERVAL_MS);
        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeat();
        }, HEARTBEAT_INTERVAL_MS);
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
        client.emit('connected', { socketId: client.id, ts: Date.now() });
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.subscriptions.forEach((sockets, endpointId) => {
            sockets.delete(client.id);
            if (sockets.size === 0) {
                this.subscriptions.delete(endpointId);
                this.logBuffer.delete(endpointId);
                this.logger.log(`No more listeners for endpoint ${endpointId}. Subscription cleaned.`);
            }
        });
    }
    onModuleDestroy() {
        clearInterval(this.heartbeatTimer);
        clearInterval(this.flushTimer);
    }
    handleSubscribe(data, client) {
        const { endpointId } = data;
        if (!endpointId)
            return;
        if (!this.subscriptions.has(endpointId)) {
            this.subscriptions.set(endpointId, new Set());
        }
        this.subscriptions.get(endpointId).add(client.id);
        client.join(`endpoint:${endpointId}`);
        this.logger.log(`Socket ${client.id} subscribed to endpoint ${endpointId}`);
        client.emit('subscribed', { endpointId });
    }
    handleUnsubscribe(data, client) {
        const { endpointId } = data;
        if (this.subscriptions.has(endpointId)) {
            this.subscriptions.get(endpointId).delete(client.id);
        }
        client.leave(`endpoint:${endpointId}`);
        this.logger.log(`Socket ${client.id} unsubscribed from endpoint ${endpointId}`);
    }
    async startStreamReader() {
        let subscriber = this.redisService.getSubscriber();
        while (!subscriber) {
            this.logger.warn('Redis subscriber not ready yet, retrying in 1s...');
            await new Promise((r) => setTimeout(r, 1000));
            subscriber = this.redisService.getSubscriber();
        }
        const poll = async () => {
            try {
                const results = await subscriber.xread('COUNT', '100', 'BLOCK', '5000', 'STREAMS', STREAM_KEY, this.lastStreamId);
                if (results) {
                    const [[, entries]] = results;
                    for (const [id, fields] of entries) {
                        this.lastStreamId = id;
                        const payloadIndex = fields.indexOf('payload');
                        if (payloadIndex === -1)
                            continue;
                        try {
                            const log = JSON.parse(fields[payloadIndex + 1]);
                            this.bufferLog(log);
                            this.aggregateMetrics(log);
                        }
                        catch {
                        }
                    }
                }
            }
            catch (err) {
                this.logger.error(`Stream read error: ${err.message}`);
                await new Promise((r) => setTimeout(r, 2000));
            }
            setImmediate(poll);
        };
        poll();
    }
    bufferLog(log) {
        const { endpointId } = log;
        if (!this.logBuffer.has(endpointId)) {
            this.logBuffer.set(endpointId, []);
        }
        this.logBuffer.get(endpointId).push(log);
    }
    async aggregateMetrics(log) {
        try {
            const publisher = this.redisService.getPublisher();
            const pipeline = publisher.pipeline();
            pipeline.incr('global:requests');
            pipeline.incrby('global:latency_sum', log.latencyMs);
            const epKeyReq = `endpoint:${log.endpointId}:stats:requests`;
            const epKeyLat = `endpoint:${log.endpointId}:stats:latency_sum`;
            pipeline.incr(epKeyReq);
            pipeline.incrby(epKeyLat, log.latencyMs);
            const minuteTs = Math.floor(Date.now() / 60000);
            pipeline.hincrby('global:traffic_curve', minuteTs.toString(), 1);
            await pipeline.exec();
        }
        catch {
        }
    }
    flushBuffers() {
        this.logBuffer.forEach((logs, endpointId) => {
            if (logs.length === 0)
                return;
            const sockets = this.subscriptions.get(endpointId);
            if (sockets && sockets.size > 0) {
                this.server.to(`endpoint:${endpointId}`).emit('logs:batch', {
                    endpointId,
                    logs,
                });
            }
            this.logBuffer.set(endpointId, []);
        });
    }
    sendHeartbeat() {
        const activeSubs = this.subscriptions.size;
        this.logger.debug(`Heartbeat — Active endpoint subscriptions: ${activeSubs}`);
        this.server.emit('heartbeat', {
            ts: Date.now(),
            activeSubs,
        });
        this.subscriptions.forEach((sockets, endpointId) => {
            if (sockets.size === 0) {
                this.subscriptions.delete(endpointId);
                this.logBuffer.delete(endpointId);
            }
        });
    }
};
exports.LogsGateway = LogsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], LogsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe:endpoint'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], LogsGateway.prototype, "handleSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe:endpoint'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], LogsGateway.prototype, "handleUnsubscribe", null);
exports.LogsGateway = LogsGateway = LogsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3001',
            credentials: true,
        },
        namespace: '/logs',
    }),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], LogsGateway);
//# sourceMappingURL=logs.gateway.js.map