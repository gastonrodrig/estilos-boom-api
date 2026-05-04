import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsNotEmpty, ValidateNested, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderItemDto } from './purchaseOrderItem.dto';

export class CreatePrePurchaseOrderDto {
  @ApiProperty({
    description: 'Lista de IDs de proveedores invitados a cotizar',
    type: [String],
    example: ['665f1c2a8f1b2c0012345678', '665f1c2a8f1b2c0098765432']
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  supplier_ids: string[];

  @ApiProperty({
    description: 'ID del trabajador que crea la orden',
    example: '665f1c2a8f1b2c0012345678'
  })
  @IsMongoId()
  @IsNotEmpty()
  id_worker: string;

  @ApiProperty({
    description: 'Lista de ítems base de la orden de compra',
    type: [PurchaseOrderItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  base_items: PurchaseOrderItemDto[];

  @ApiPropertyOptional({
    description: 'Notas adicionales de la orden',
    example: 'Se requiere entrega urgente'
  })
  @IsString()
  @IsOptional()
  notes?: string;
}