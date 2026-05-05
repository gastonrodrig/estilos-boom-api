import { IsString, IsNotEmpty, IsNumber, IsMongoId, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVariantDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  @IsNotEmpty()
  id_product: string;

  @ApiProperty({ example: 'XL' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiProperty({ example: 'Negro' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  physical_stock?: number;

  @ApiProperty({ example: 'VEST-GALA-XL-BLK' })
  @IsString()
  @IsNotEmpty()
  sku_variant: string;

  @ApiProperty()
  @IsNumber()
  stock: number;

  @ApiProperty({example: 10})
  @IsNumber()
  min_stock_alert: number;
}