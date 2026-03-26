import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClientAdminDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsOptional()
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsOptional()
  last_name: string;

  @ApiProperty({ example: 'URP' })
  @IsString()
  @IsOptional()
  company_name: string;

  @ApiProperty({ example: 'Name' })
  @IsString()
  @IsOptional()
  contact_name: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsOptional()
  phone: string;

  @ApiProperty({ enum: ['Persona', 'Empresa'], example: 'Persona' })
  @IsEnum(['Persona', 'Empresa'])
  @IsNotEmpty()
  client_type: string;

  @ApiProperty({ enum: ['DNI', 'RUC', 'Extranjeria', 'Pasaporte'], example: 'DNI', required: false })
  @IsEnum(['DNI', 'RUC', 'Extranjeria', 'Pasaporte'])
  @IsOptional()
  document_type?: string;

  @ApiProperty({ example: '12345678', required: false })
  @IsString()
  @IsOptional()
  document_number?: string;
}