import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Dresses', description: 'Nombre de la categoría' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Nuestra colección de vestidos elegantes', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}