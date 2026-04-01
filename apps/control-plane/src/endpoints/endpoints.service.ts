import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateEndpointDto } from './dto/create-endpoint.dto';
import { UpdateEndpointDto } from './dto/update-endpoint.dto';

@Injectable()
export class EndpointsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(dto: CreateEndpointDto) {
    const existing = await this.prisma.endpoint.findUnique({
      where: {
        path_method: {
          path: dto.path,
          method: dto.method,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Endpoint with path ${dto.path} and method ${dto.method} already exists.`);
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
    } catch (err) {
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

  async findOne(id: string) {
    const endpoint = await this.prisma.endpoint.findUnique({
      where: { id },
      include: {
        rules: true,
      },
    });
    if (!endpoint) throw new NotFoundException('Endpoint not found');
    return endpoint;
  }

  async update(id: string, dto: UpdateEndpointDto) {
    const existing = await this.prisma.endpoint.findUnique({
      where: { id },
      include: { rules: true },
    });
    if (!existing) throw new NotFoundException('Endpoint not found');

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
      // If path changed, we should ideally delete the old redisKey.
      // But for MVP simplicity, we overwrite the new/current one.
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
    } catch (err) {
      console.error('Failed to update endpoint in Redis', err);
    }

    return updated;
  }

  async remove(id: string) {
    const endpoint = await this.prisma.endpoint.findUnique({ where: { id }});
    if (!endpoint) throw new NotFoundException('Endpoint not found');

    const result = await this.prisma.endpoint.delete({
      where: { id },
    });

    try {
      const publisher = this.redis.getPublisher();
      await publisher.del(`endpoint:${endpoint.path}`);
    } catch (err) {
      console.error('Failed to remove endpoint from Redis', err);
    }

    return result;
  }
}
