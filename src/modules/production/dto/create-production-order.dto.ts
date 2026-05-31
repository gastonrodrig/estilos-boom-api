import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsNotEmpty, ValidateNested, IsString, IsOptional, IsNumber, IsDateString, ArrayMaxSize, ArrayMinSize, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductionSupplyItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  unitConsumption: number;

  @IsNumber()
  @IsNotEmpty()
  totalQuantity: number;

  @IsNumber()
  @IsOptional()
  theoreticalQuantity?: number;

  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class ProductionVariantItemDto {
  @IsMongoId()
  @IsNotEmpty()
  id_variant: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsOptional()
  unit_cost?: number;
}

export class CreateProductionOrderDto {
  @ApiProperty({ description: 'ID del taller invitado a cotizar (solo 1)', type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe seleccionar un taller.' })
  @ArrayMaxSize(1, { message: 'Solo se puede asignar un taller por orden.' })
  @IsMongoId({ each: true })
  workshop_ids: string[];

  @ApiProperty({ description: 'ID del trabajador' })
  @IsMongoId()
  @IsNotEmpty()
  id_worker: string;

  @ApiProperty({ description: 'Ítems (variantes) a confeccionar', type: [ProductionVariantItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionVariantItemDto)
  base_items: ProductionVariantItemDto[];

  @ApiProperty({ description: 'Ficha Técnica / Insumos calculados', type: [ProductionSupplyItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionSupplyItemDto)
  supplies: ProductionSupplyItemDto[];

  @ApiPropertyOptional({ description: 'Observaciones para los talleres' })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiPropertyOptional({ description: 'Fecha esperada de entrega' })
  @IsDateString()
  @IsOptional()
  delivery_date_estimated?: string;
}
