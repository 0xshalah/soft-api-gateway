import { Module } from '@nestjs/common';
import { LogsGateway } from './logs.gateway';

@Module({
  providers: [LogsGateway],
})
export class LogsModule {}
