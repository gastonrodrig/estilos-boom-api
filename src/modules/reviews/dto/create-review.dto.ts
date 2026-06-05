import { IsMongoId, IsNotEmpty, IsNumber, Min, Max, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'The ID of the product being reviewed' })
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'The ID of the order' })
  @IsMongoId()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Optional text review' })
  @IsString()
  @IsOptional()
  comment?: string;
}
