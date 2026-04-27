import { IsMongoId, IsNumber, IsNotEmpty, Min } from 'class-validator';

export class PurchaseOrderItemDto {
  @IsMongoId()
  @IsNotEmpty()
  id_variant: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  unit_cost: number;
}