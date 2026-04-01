import { IsString, IsNotEmpty, IsUrl, IsOptional, IsInt, IsNumber } from 'class-validator';

export class CreateEndpointDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  targetUrl: string;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsOptional()
  @IsString()
  upstreamAuth?: string;

  @IsOptional()
  @IsInt()
  rateLimitRpm?: number;

  @IsOptional()
  @IsInt()
  retryCount?: number;

  @IsOptional()
  @IsNumber()
  backoffMultiplier?: number;
}
