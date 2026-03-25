import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateClientAddressAdminDto {
  @ApiProperty({ example: 'Av. Larco 123, Dpto 402' })
  @IsString()
  address_line: string;

  @ApiPropertyOptional({ example: 'Frente al parque Kennedy' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Lima' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: 'Lima' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ example: 'Miraflores' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}