import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRawMaterialDto {
    @ApiProperty({ example: 'Tela de Algodón' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Color negro, 200gsm', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'Metros' })
    @IsString()
    @IsNotEmpty()
    unit_measure: string;

    @ApiProperty({ example: 100 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    stock?: number;

    @ApiProperty({ example: 10 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    min_stock?: number;
}
