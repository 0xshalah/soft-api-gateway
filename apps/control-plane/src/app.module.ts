import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { EndpointsModule } from './endpoints/endpoints.module';
import { KeysModule } from './keys/keys.module';
import { RedisModule } from './redis/redis.module';
import { LogsModule } from './logs/logs.module';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [RedisModule, PrismaModule, EndpointsModule, KeysModule, LogsModule, HealthModule, AnalyticsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
