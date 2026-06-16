// src/modules/inventory/dto/create-warehouse-document.dto.ts
import { IsMongoId, IsNotEmpty, IsEnum, IsString, IsOptional, IsArray, ValidateNested, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

// Sub-clase para validar cada ítem dentro del array de productos
class WarehouseDocumentItemDto {
  @IsMongoId()
  @IsNotEmpty()
  id_variant: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity_expected: number; // Lo que debería llegar o salir según sistema

  @IsNumber()
  @IsOptional()
  quantity_received?: number; // Lo que el almacenero cuenta físicamente (opcional al crear)

  @IsString()
  @IsOptional()
  incidence_note?: string; // Observaciones de prendas rotas, falladas, etc.
}

export class CreateWarehouseDocumentDto {
  @IsString()
  @IsNotEmpty()
  document_number: string; // Ej: "DOC-2026-0001" o tu correlativo automático

  @IsEnum(['INGRESO_COMPRA', 'INGRESO_PRODUCCION', 'SALIDA_VENTA', 'TRANSFERENCIA', 'AJUSTE'])
  @IsNotEmpty()
  type: 'INGRESO_COMPRA' | 'INGRESO_PRODUCCION' | 'SALIDA_VENTA' | 'TRANSFERENCIA' | 'AJUSTE';

  @IsEnum(['PENDIENTE', 'EN_TRANSITO', 'COMPLETADO', 'CANCELADO'])
  @IsOptional()
  status?: string; // Por defecto el controlador o esquema lo iniciará en PENDIENTE

  @IsMongoId()
  @IsOptional()
  id_source_warehouse?: string; // Obligatorio si es TRANSFERENCIA, SALIDA o AJUSTE

  @IsMongoId()
  @IsOptional()
  id_target_warehouse?: string; // Obligatorio si es TRANSFERENCIA o INGRESO_COMPRA

  @IsMongoId()
  @IsOptional()
  id_origin_doc?: string; // ID de la Orden de Compra o Pedido de venta de origen (si aplica)

  @IsMongoId()
  @IsNotEmpty()
  id_sender_worker: string; // ID del administrador que genera la orden o el despachador

  @IsMongoId()
  @IsOptional()
  id_receiver_worker?: string; // Se llena cuando el almacenero de destino da la conformidad

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarehouseDocumentItemDto)
  @IsNotEmpty()
  items: WarehouseDocumentItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}