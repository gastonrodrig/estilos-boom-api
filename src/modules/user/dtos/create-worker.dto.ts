import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkerDto {
  @ApiProperty({ example: 'worker@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ example: 'Pérez García' })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'DNI' })
  @IsString()
  @IsOptional()
  document_type?: string;

  @ApiPropertyOptional({ example: '76543210' })
  @IsString()
  @IsOptional()
  document_number?: string;

  @ApiPropertyOptional({ example: 'Almacenero Boom' })
  @IsString()
  @IsOptional()
  role?: string;
}
