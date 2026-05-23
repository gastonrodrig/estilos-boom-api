import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductionVariantItemDto } from './create-production-order.dto';

export class UpdateWorkshopQuoteDto {
  @ApiProperty({ description: 'ID del taller' })
  @IsMongoId()
  @IsNotEmpty()
  id_workshop: string;

  @ApiProperty({ description: 'Costos unitarios por variante', type: [ProductionVariantItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionVariantItemDto)
  items: ProductionVariantItemDto[];
}
