import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFavoriteDto {
  @ApiProperty({ description: 'The ID of the product to favorite' })
  @IsMongoId()
  @IsNotEmpty()
  productId: string;
}
