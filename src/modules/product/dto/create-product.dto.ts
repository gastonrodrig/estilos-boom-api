import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, IsNotEmpty, IsOptional, IsNumber, 
  IsBoolean, IsArray, ValidateNested 
} from 'class-validator';
import { Type } from 'class-transformer';

// 1. Definimos el DTO de la variante aquí mismo o lo importamos
export class CreateProductVariantDto {
  @ApiProperty({ example: 'S' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiProperty({ example: 'Negro' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsNotEmpty()
  stock: number;

  @ApiProperty({ example: 'EB-POL-001-S-BLK' })
  @IsString()
  @IsNotEmpty()
  sku_variant: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Vestido Seda Rosa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Vestido elegante de seda ideal para eventos.', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'EB-VES-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 59.90 })
  @IsNumber()
  base_price: number; // Cambiamos price por base_price según tu Prisma

  @ApiProperty({ example: 'uuid-de-la-categoria' })
  @IsString()
  @IsNotEmpty()
  id_category: string; // Cambiado para que coincida con tu esquema de Prisma

  @ApiProperty({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  is_best_seller?: boolean; // Usamos snake_case para que coincida con Prisma

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  is_new_in?: boolean; // Usamos snake_case para que coincida con Prisma

  @ApiProperty({ example: ['url1.jpg', 'url2.jpg'] })
  @IsArray()
  @IsOptional()
  images?: string[];

  // 2. AGREGAMOS LAS VARIANTES
  @ApiProperty({ type: [CreateProductVariantDto], description: 'Lista de tallas y colores' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];
}