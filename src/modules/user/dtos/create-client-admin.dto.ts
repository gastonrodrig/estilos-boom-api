import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { document_type_enum, client_type_enum } from '@prisma/client';

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

  @ApiProperty({ enum: client_type_enum, example: client_type_enum.Persona })
  @IsEnum(client_type_enum)
  @IsNotEmpty()
  client_type: client_type_enum;

  @ApiProperty({ enum: document_type_enum, example: document_type_enum.DNI, required: false })
  @IsEnum(document_type_enum)
  @IsOptional()
  document_type?: document_type_enum;

  @ApiProperty({ example: '12345678', required: false })
  @IsString()
  @IsOptional()
  document_number?: string; 
}