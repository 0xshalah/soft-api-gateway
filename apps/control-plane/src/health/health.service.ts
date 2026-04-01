import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/30 * * * * *') // Eksekusi setiap 30 Detik
  async checkAllEndpointsUptime() {
    this.logger.debug('Running active health checks for all endpoints...');
    try {
      // Menggunakan raw query untuk menghindari Type Error karena gagal prisma generate di Windows Lock
      const endpoints: any[] = await this.prisma.$queryRawUnsafe('SELECT id, target_url as "targetUrl", method FROM endpoints');
      
      for (const endpoint of endpoints) {
        let status = 'Active';
        
        try {
          const startTime = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // Strict 3 second timeout for health ping

          const callMethod = endpoint.method === 'ALL' ? 'GET' : endpoint.method;
          
          const res = await fetch(endpoint.targetUrl, {
            method: callMethod,
            headers: { 'User-Agent': 'SoftAnalytics-Health-Prober/1.0' },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const latency = Date.now() - startTime;
          
          // Jika server membalas dengan status sukses tetapi sangat lambat
          if (latency > 1500) {
            status = 'Degraded';
          }
          // Jika server merespons 4xx/5xx (Internal error upstream)
          if (!res.ok && res.status >= 500) {
            status = 'Degraded'; 
          }
        } catch (error) {
           // Connection Refused, DNS Failed, Timeout, dll
           status = 'Down';
        }

        // Tulis langsung ke database menggunakan parameter aman (SQL Injection Prevented)
        await this.prisma.$executeRaw`UPDATE endpoints SET status = ${status}, last_health_check = NOW() WHERE id = ${endpoint.id}::uuid`;
      }
      this.logger.debug('Active health checks completed.');
    } catch (err) {
       this.logger.error('Sistem deteksi Uptime gagal terhubung ke database Postgres: ' + (err as Error).message);
    }
  }
}
