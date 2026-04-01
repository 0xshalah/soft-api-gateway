import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async getGlobalOverview() {
    const publisher = this.redis.getPublisher();
    
    // 1. Total Requests
    const reqStr = await publisher.get('global:requests');
    const totalReqs = parseInt(reqStr || '0', 10);
    
    // 2. Average Latency
    const latStr = await publisher.get('global:latency_sum');
    const latSum = parseInt(latStr || '0', 10);
    const avgLatency = totalReqs > 0 ? Math.round(latSum / totalReqs) : 0;

    // 3. Traffic Curve calculation (Last 45 minutes to fill chart nicely)
    const trafficHash = (await publisher.hgetall('global:traffic_curve')) || {};
    const currentMin = Math.floor(Date.now() / 60000);
    const trafficData = [];
    // Trik visual: jika tidak ada traffic sama sekali (sistem kosong), buat garis rata bawah
    for (let i = 44; i >= 0; i--) {
        const bucket = currentMin - i;
        const vol = parseInt(trafficHash[bucket.toString()] || '0', 10);
        trafficData.push(vol);
    }
    
    // Tambahan animasi kosmetik halus jika traffic persis 0
    const hasData = trafficData.some(v => v > 0);
    if (!hasData) {
       for(let i=0; i<trafficData.length; i++) trafficData[i] = 1; // 1 pixel baseline rendering
    }

    // 4. System Uptime Health
    const endpoints = await this.prisma.$queryRawUnsafe<any[]>('SELECT status FROM endpoints');
    let upCount = 0;
    endpoints.forEach(ep => {
      if (ep.status === 'Active' || ep.status === 'Degraded') upCount++;
    });
    const uptimePercent = endpoints.length > 0 ? ((upCount / endpoints.length) * 100).toFixed(2) : '100.00';

    // Formatter
    const formatNumber = (num: number) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
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
}
