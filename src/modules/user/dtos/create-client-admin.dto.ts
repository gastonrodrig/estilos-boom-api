import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { document_type_enum, client_type_enum } from '@prisma/client';
import { CreateClientAddressAdminDto } from './create-client-address-admin.dto';

export class CreateClientAdminDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiPropertyOptional({ example: 'URP SAC' })
  @IsString()
  @IsOptional()
  company_name?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsString()
  @IsOptional()
  contact_name?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: client_type_enum, example: client_type_enum.Persona })
  @IsEnum(client_type_enum)
  @IsNotEmpty()
  client_type: client_type_enum;

  @ApiPropertyOptional({
    enum: document_type_enum,
    example: document_type_enum.DNI,
  })
  @IsEnum(document_type_enum)
  @IsOptional()
  document_type?: document_type_enum;

  @ApiPropertyOptional({ example: '12345678' })
  @IsString()
  @IsOptional()
  document_number?: string;

  @ApiPropertyOptional({
    type: [CreateClientAddressAdminDto],
    example: [
      {
        address_line: 'Av. Larco 123, Dpto 402',
        reference: 'Frente al parque Kennedy',
        department: 'Lima',
        province: 'Lima',
        district: 'Miraflores',
        is_default: true,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateClientAddressAdminDto)
  addresses?: CreateClientAddressAdminDto[];
}