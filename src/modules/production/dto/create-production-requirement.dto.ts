import { IsNotEmpty, IsNumber, Min, IsMongoId, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductionRequirementDto {
    @ApiProperty()
    @IsMongoId()
    @IsNotEmpty()
    id_production_order: string;

    @ApiProperty()
    @IsMongoId()
    @IsNotEmpty()
    id_material: string;

    @ApiProperty({ example: 5.5 })
    @IsNumber()
    @Min(0.01)
    quantity_required: number;

    @ApiProperty({ default: false })
    @IsBoolean()
    @IsOptional()
    was_discounted?: boolean;
}
