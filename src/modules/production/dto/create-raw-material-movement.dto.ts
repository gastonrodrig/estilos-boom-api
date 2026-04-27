import { IsNotEmpty, IsNumber, IsMongoId, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MovementType } from '../enums/production.enums';

export class CreateRawMaterialMovementDto {
    @ApiProperty()
    @IsMongoId()
    @IsNotEmpty()
    id_material: string;

    @ApiProperty({ required: false })
    @IsMongoId()
    @IsOptional()
    id_production_order?: string;

    @ApiProperty({ enum: MovementType })
    @IsEnum(MovementType)
    @IsNotEmpty()
    type: MovementType;

    @ApiProperty({ example: 10 })
    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    previous_stock: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    new_stock: number;
}
