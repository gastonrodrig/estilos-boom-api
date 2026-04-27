// src/modules/inventory/dto/update-order-status.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsDateString, IsMongoId, IsNumber, Min, Max } from 'class-validator';
import { OrderStatus } from '../enum/supply.constants';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;

  @IsDateString()
  @IsOptional()
  delivery_date_actual?: string;

  @IsMongoId()
  @IsOptional()
  id_worker_receiver?: string;

  // --- NUEVOS CAMPOS PARA EL RANKING ---
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  quality_rating?: number; // Vital para el algoritmo del jueves

  @IsNumber()
  @IsOptional()
  @Min(0)
  shipping_cost?: number; // Para medir eficiencia de costos del proveedor
}