import { IsMongoId, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSuggestionDto {
  @ApiProperty({ description: 'Category of suggestion' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'The ID of the product' })
  @IsMongoId()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'Requested size' })
  @IsString()
  @IsOptional()
  sizeRequested?: string;

  @ApiPropertyOptional({ description: 'Suggested color' })
  @IsString()
  @IsOptional()
  colorSuggested?: string;

  @ApiPropertyOptional({ description: 'Detailed message' })
  @IsString()
  @IsOptional()
  message?: string;
}
