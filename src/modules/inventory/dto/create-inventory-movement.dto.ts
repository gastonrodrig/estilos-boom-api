// src/modules/inventory/dto/create-inventory-movement.dto.ts
import { IsMongoId, IsNotEmpty, IsNumber, IsEnum, IsString, IsOptional, Min } from 'class-validator';
import { MovementType } from '../enum/supply.constants';

export class CreateInventoryMovementDto {
  @IsMongoId()
  @IsNotEmpty()
  id_variant: string;

  @IsEnum(MovementType)
  @IsNotEmpty()
  type: MovementType; // ENTRADA, SALIDA, AJUSTE

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  previous_stock: number;

  @IsNumber()
  @IsNotEmpty()
  new_stock: number; // En tu esquema anterior lo llamaste stock_resultante

  @IsString()
  @IsNotEmpty()
  reason: string; // Ej: "Recepción OC-001" o "Ajuste por merma"

  @IsMongoId()
  @IsNotEmpty()
  id_worker: string;

  @IsMongoId()
  @IsOptional()
  id_purchase_order?: string; // Solo si el movimiento viene de una compra
}