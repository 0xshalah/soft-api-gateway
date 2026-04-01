import { IsString, IsNotEmpty, IsArray, IsUUID, IsOptional } from 'class-validator';

export class CreateKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsString({ each: true })
  scopes: string[];

  @IsOptional()
  @IsUUID()
  userId?: string;
}
