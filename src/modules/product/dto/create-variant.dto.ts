import { IsString, IsNotEmpty, IsNumber, IsMongoId, IsOptional, Min, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ColorDetailDto {
  @ApiProperty({ example: 'Rosa Barbie' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '#FF4FA3' })
  @IsString()
  @IsNotEmpty()
  hex: string;
}

export class CreateVariantDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1', description: 'ID del producto padre' })
  @IsMongoId()
  @IsNotEmpty()
  id_product: string;

  @ApiProperty({ example: 'XL' })
  @IsString()
  @IsNotEmpty()
  size: string;

  // 🎨 CAMBIO CLAVE: Cambió de IsString a IsObject mapeado con nuestro sub-DTO
  @ApiProperty({ type: ColorDetailDto, description: 'Detalle estructurado del color' })
  @IsObject()
  @IsNotEmpty()
  color: ColorDetailDto;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 10, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  physical_stock?: number;

  @ApiProperty({ example: 'VEST-GALA-XL-BLK' })
  @IsString()
  @IsNotEmpty()
  sku_variant: string;

  @ApiProperty({ example: 10, default: 10 })
  @IsNumber()
  min_stock_alert: number;
}