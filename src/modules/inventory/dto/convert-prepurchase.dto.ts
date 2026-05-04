import { IsDateString, IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConvertPrePurchaseOrderDto {
  @ApiProperty({ 
    example: '69f7c430bea31f1da6dab3cc', 
    description: 'ID del proveedor seleccionado para ganar la orden' 
  })
  @IsMongoId()
  @IsNotEmpty()
  id_supplier: string;

  @IsDateString() // ✅ Esto asegura que la fecha sea un string válido de tipo ISO
  @IsNotEmpty()
  delivery_date_estimated: string;
}