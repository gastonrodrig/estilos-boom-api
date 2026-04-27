// purchase-order-item.dto.ts


// create-purchase-order.dto.ts
import { IsMongoId, IsNotEmpty, IsArray, IsNumber, IsOptional, IsString, IsEnum, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderItemDto } from './purchaseOrderItem.dto';
import { OrderStatus } from '../enum/supply.constants';

export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  order_number: string;

  @IsMongoId()
  @IsNotEmpty()
  id_supplier: string;

  @IsMongoId()
  @IsNotEmpty()
  id_worker: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @IsNumber()
  @IsNotEmpty()
  total_amount: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  delivery_date_estimated?: string;
}