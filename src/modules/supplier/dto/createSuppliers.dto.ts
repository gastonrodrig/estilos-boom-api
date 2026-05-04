import { IsString, IsEmail, IsNotEmpty, IsOptional, Matches, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Textiles del Sur S.A.C.' })
  @IsString()
  @IsNotEmpty()
  name_company: string;

  @ApiProperty({ example: '20601234567' })
  @IsString()
  @IsNotEmpty()
  ruc: string;

  @ApiProperty({ example: 'Carlos Pérez', required: false })
  @IsString()
  @IsOptional()
  contact_person?: string;

  @ApiProperty({ example: 'ventas@textilessur.pe', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+51987654321', required: false })
  @Matches(/^[+]?[0-9\s\-()]{6,}$/, { message: 'Teléfono inválido' })
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Av. Gamarra 456, La Victoria', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  // Importante: Esto convierte strings "true"/"false" a booleanos reales
  @Transform(({ value }) => value === 'true' || value === true) 
  status?: boolean;
}