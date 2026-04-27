import { IsString, IsNotEmpty, IsNumber, Min, IsEnum, IsDateString, IsMongoId, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductionPriority, ProductionStatus } from '../enums/production.enums';

export class CreateProductionOrderDto {
    @ApiProperty({ example: 'OP-001' })
    @IsString()
    @IsNotEmpty()
    order_number: string;

    @ApiProperty({ example: '60f7c1b5b5b5b5b5b5b5b5b5' })
    @IsMongoId()
    @IsNotEmpty()
    id_product_variant: string;

    @ApiProperty({ example: '60f7c1b5b5b5b5b5b5b5b5b5' })
    @IsMongoId()
    @IsNotEmpty()
    id_worker_manager: string;

    @ApiProperty({ example: 50 })
    @IsNumber()
    @Min(1)
    quantity_to_produce: number;

    @ApiProperty({ enum: ProductionStatus, default: ProductionStatus.PLANIFICADO })
    @IsEnum(ProductionStatus)
    @IsOptional()
    status?: ProductionStatus;

    @ApiProperty({ enum: ProductionPriority, default: ProductionPriority.MEDIA })
    @IsEnum(ProductionPriority)
    @IsOptional()
    priority?: ProductionPriority;

    @ApiProperty({ example: '2023-12-31' })
    @IsDateString()
    @IsNotEmpty()
    deadline: Date;
}
