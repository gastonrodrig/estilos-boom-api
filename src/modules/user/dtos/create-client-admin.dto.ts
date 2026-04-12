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
import { CreateClientAddressAdminDto } from './create-client-address-admin.dto';
import { DocType } from 'src/core/constants/app.constants';

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

  @ApiProperty({ enum: ['Persona', 'Empresa'], example: 'Persona' })
  @IsEnum(['Persona', 'Empresa'])
  @IsNotEmpty()
  client_type: string;

  @ApiPropertyOptional({
    enum: DocType,
    example: DocType.DNI,
  })
  @IsEnum(DocType)
  @IsOptional()
  document_type?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsString()
  @IsOptional()
  document_number?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsString()
  @IsOptional()
  password?: string;

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