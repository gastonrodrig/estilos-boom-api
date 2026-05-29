import { IsArray, IsMongoId, IsNotEmpty, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderItemDto } from './purchaseOrderItem.dto';

export class UpdateSupplierQuoteDto {
  @IsMongoId()
  @IsNotEmpty()
  id_agent: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[]; // Aquí los items ya vienen con el unit_cost real
}