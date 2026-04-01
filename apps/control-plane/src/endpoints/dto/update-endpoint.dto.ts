import { IsString, IsOptional, IsUrl, IsInt, IsNumber } from 'class-validator';

export class UpdateEndpointDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  targetUrl?: string;

  @IsOptional()
  @IsString()
  method?: string;

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
