import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWorkerDto {
    @ApiProperty({ example: 'John Doe', required: false })
    @IsOptional()
    @IsString()
    full_name?: string;

    @ApiProperty({ example: '987654321', required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
