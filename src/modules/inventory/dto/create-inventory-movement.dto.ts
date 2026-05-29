// src/modules/inventory/dto/create-inventory-movement.dto.ts
import { IsMongoId, IsNotEmpty, IsNumber, IsEnum, Min } from 'class-validator';

export class CreateInventoryMovementDto {
  @IsMongoId()
  @IsNotEmpty()
  id_variant: string;

  @IsMongoId()
  @IsNotEmpty()
  id_warehouse: string;

  @IsMongoId()
  @IsNotEmpty()
  id_document: string; // ID del WarehouseDocument que generó este movimiento

  @IsMongoId()
  @IsNotEmpty()
  id_worker: string; // Almacenero que ejecuta la acción física

  @IsEnum(['ENTRADA', 'SALIDA'])
  @IsNotEmpty()
  type: 'ENTRADA' | 'SALIDA';

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  previous_stock: number;

  @IsNumber()
  @IsNotEmpty()
  new_stock: number;

  @IsEnum(['COMPRA', 'VENTA', 'TRANSFERENCIA', 'AJUSTE'])
  @IsNotEmpty()
  reason: 'COMPRA' | 'VENTA' | 'TRANSFERENCIA' | 'AJUSTE';
}