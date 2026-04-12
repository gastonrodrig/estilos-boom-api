import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  IsObject,
  IsArray,
  IsEnum,
  IsMongoId,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Vestido Gala Premium' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Vestido de algodón orgánico...', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'VEST-GALA-01' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 140.50 })
  @IsNumber()
  @Min(0)
  base_price: number; // 👈 Cambiado a base_price para hacer match con el Schema

  @ApiProperty({ example: 'MUJER', enum: ['MUJER', 'HOMBRE', 'UNISEX'] })
  @IsEnum(['MUJER', 'HOMBRE', 'UNISEX'], { message: 'Género no válido' })
  gender: string;

  @ApiProperty({ example: 'CASUAL PREMIUM', required: false })
  @IsString()
  @IsOptional()
  style_type?: string;

  @ApiProperty({ example: '95% ALGODÓN, 5% ELASTANO' })
  @IsString()
  @IsOptional()
  composition?: string;

  @ApiProperty({ example: 'PRIMAVERA 2026' })
  @IsString()
  @IsOptional()
  season?: string;

  @ApiProperty({ 
    example: ['Tejido transpirable', 'Corte entallado'], 
    description: 'Puntos clave del producto',
    type: [String] 
  })
  @IsArray()
  @IsString({ each: true }) // Valida que cada elemento del array sea un string
  @IsOptional()
  highlights?: string[];

  @ApiProperty({ example: 'https://cdn.estilosboom.com/guides/special-dress.jpg', required: false })
  @IsString()
  @IsOptional()
  custom_size_guide_url?: string;

  @ApiProperty({ example: { escote: 'V', largo: 'Midi' }, required: false })
  @IsObject()
  @IsOptional()
  technical_details?: Record<string, string>;

  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID de la categoría' })
  @IsMongoId() // Valida que sea un ID real de MongoDB
  @IsNotEmpty()
  id_category: string;

  @ApiProperty({ required: false })
  @IsOptional()
  variants?: any;
}