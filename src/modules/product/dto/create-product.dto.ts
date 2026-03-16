import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  IsBoolean, // Importante para los checks
  IsArray
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Vestido Seda Rosa', description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Vestido elegante de seda ideal para eventos.', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'EB-VES-001', description: 'Código único de inventario' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 149.90 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  stock: number;

  // --- LAS PROPIEDADES QUE FALTABAN ---

  @ApiProperty({ example: 'uuid-de-la-categoria', description: 'ID de la categoría relacionada' })
  @IsString()
  @IsNotEmpty()
  categoryId: string; // Esto conecta con tu tabla de categorías

  @ApiProperty({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  isBestSeller?: boolean;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isNewIn?: boolean;

  @ApiProperty({ example: ['url1.jpg', 'url2.jpg'], description: 'Links de fotos en Firebase' })
  @IsArray()
  @IsOptional()
  images?: string[];
}