import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { Logger, OnModuleDestroy } from '@nestjs/common';

// --- Constants ---
const STREAM_KEY = 'traffic_logs_stream';
const HEARTBEAT_INTERVAL_MS = 30_000;
const THROTTLE_INTERVAL_MS = 250; // Batch flush every 250ms

// --- Interfaces ---
interface TrafficLog {
  id: string;
  timestamp: string;
  endpointId: string;
  statusCode: number;
  latencyMs: number;
  method: string;
  path: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/logs',
})
export class LogsGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LogsGateway.name);

  // --- State ---
  // Map<endpointId, Set<socketId>>
  private subscriptions = new Map<string, Set<string>>();
  // Map<endpointId, LogEntry[]> — buffer for throttled flush
  private logBuffer = new Map<string, TrafficLog[]>();
  // Heartbeat and flush timers
  private heartbeatTimer: NodeJS.Timeout;
  private flushTimer: NodeJS.Timeout;
  // Redis stream cursor
  private lastStreamId = '$';

  constructor(private readonly redisService: RedisService) {}

  afterInit() {
    this.logger.log('LogsGateway initialized on namespace /logs');

    // 1. Start the Redis Stream poller
    this.startStreamReader();

    // 2. Start the server-side throttle flush timer
    this.flushTimer = setInterval(() => {
      this.flushBuffers();
    }, THROTTLE_INTERVAL_MS);

    // 3. Start 30s heartbeat to prune dead connections
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', { socketId: client.id, ts: Date.now() });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up all subscriptions for this socket
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

  // --- Subscribe to specific endpoint logs ---
  @SubscribeMessage('subscribe:endpoint')
  handleSubscribe(
    @MessageBody() data: { endpointId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { endpointId } = data;
    if (!endpointId) return;

    if (!this.subscriptions.has(endpointId)) {
      this.subscriptions.set(endpointId, new Set());
    }
    this.subscriptions.get(endpointId)!.add(client.id);
    client.join(`endpoint:${endpointId}`);

    this.logger.log(`Socket ${client.id} subscribed to endpoint ${endpointId}`);
    client.emit('subscribed', { endpointId });
  }

  // --- Unsubscribe from endpoint logs ---
  @SubscribeMessage('unsubscribe:endpoint')
  handleUnsubscribe(
    @MessageBody() data: { endpointId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { endpointId } = data;
    if (this.subscriptions.has(endpointId)) {
      this.subscriptions.get(endpointId)!.delete(client.id);
    }
    client.leave(`endpoint:${endpointId}`);
    this.logger.log(`Socket ${client.id} unsubscribed from endpoint ${endpointId}`);
  }

  // --- Internal: Read from Redis Stream (XREAD) ---
  private async startStreamReader() {
    let subscriber = this.redisService.getSubscriber();

    // Wait until Redis client is actually instantiated (race condition fix)
    while (!subscriber) {
      this.logger.warn('Redis subscriber not ready yet, retrying in 1s...');
      await new Promise((r) => setTimeout(r, 1000));
      subscriber = this.redisService.getSubscriber();
    }

    const poll = async () => {
      try {
        // XREAD COUNT 100 BLOCK 5000 STREAMS traffic_logs_stream >
        const results = await subscriber.xread(
          'COUNT', '100',
          'BLOCK', '5000',
          'STREAMS', STREAM_KEY, this.lastStreamId,
        );

        if (results) {
          // results: [[streamName, [[id, fields], ...]]]
          const [[, entries]] = results as any;
          for (const [id, fields] of entries) {
            this.lastStreamId = id; // Advance cursor
            const payloadIndex = fields.indexOf('payload');
            if (payloadIndex === -1) continue;

            try {
              const log: TrafficLog = JSON.parse(fields[payloadIndex + 1]);
              // Route into the correct buffer
              this.bufferLog(log);
              // Store metrics persistently (Soft Analytics Engine)
              this.aggregateMetrics(log);
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (err) {
        this.logger.error(`Stream read error: ${err.message}`);
        await new Promise((r) => setTimeout(r, 2000)); // Backoff 2s on error
      }

      // Recursive poll (keeps reading indefinitely)
      setImmediate(poll);
    };

    poll();
  }

  // --- Internal: Buffer logs per endpoint ---
  private bufferLog(log: TrafficLog) {
    const { endpointId } = log;
    if (!this.logBuffer.has(endpointId)) {
      this.logBuffer.set(endpointId, []);
    }
    this.logBuffer.get(endpointId)!.push(log);
  }

  // --- Internal: Store Metrics for Analytics ---
  private async aggregateMetrics(log: TrafficLog) {
    try {
      const publisher = this.redisService.getPublisher();
      const pipeline = publisher.pipeline();
      
      // Global metrics
      pipeline.incr('global:requests');
      pipeline.incrby('global:latency_sum', log.latencyMs);

      // Endpoint-specific metrics
      const epKeyReq = `endpoint:${log.endpointId}:stats:requests`;
      const epKeyLat = `endpoint:${log.endpointId}:stats:latency_sum`;
      pipeline.incr(epKeyReq);
      pipeline.incrby(epKeyLat, log.latencyMs);

      // Simple time-series chart (Bucket by minute)
      const minuteTs = Math.floor(Date.now() / 60000);
      pipeline.hincrby('global:traffic_curve', minuteTs.toString(), 1);

      await pipeline.exec();
    } catch {
      // Best-effort tracking, do not crash Stream reader on latency
    }
  }

  // --- Internal: Throttled flush to subscribed rooms ---
  private flushBuffers() {
    this.logBuffer.forEach((logs, endpointId) => {
      if (logs.length === 0) return;

      // Only emit if there are active subscribers for this endpoint
      const sockets = this.subscriptions.get(endpointId);
      if (sockets && sockets.size > 0) {
        this.server.to(`endpoint:${endpointId}`).emit('logs:batch', {
          endpointId,
          logs,
        });
      }

      // Clear the buffer after flush
      this.logBuffer.set(endpointId, []);
    });
  }

  // --- Internal: 30s Heartbeat ---
  private sendHeartbeat() {
    const activeSubs = this.subscriptions.size;
    this.logger.debug(`Heartbeat — Active endpoint subscriptions: ${activeSubs}`);

    // Emit server heartbeat to all connected clients for RTT keep-alive
    this.server.emit('heartbeat', {
      ts: Date.now(),
      activeSubs,
    });

    // Memory audit: remove empty subscription sets
    this.subscriptions.forEach((sockets, endpointId) => {
      if (sockets.size === 0) {
        this.subscriptions.delete(endpointId);
        this.logBuffer.delete(endpointId);
      }
    });
  }
}
