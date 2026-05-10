import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateWorkshopDto {
  @ApiProperty()
  @IsString()
  name_company: string;

  @ApiProperty()
  @IsString()
  ruc: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  contact_person?: string;

  @ApiProperty()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty()
  @IsString()
  specialty: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  weekly_capacity?: number;

  @ApiProperty({ enum: ['AVAILABLE', 'LIMITED', 'SATURATED', 'INACTIVE'] })
  @IsEnum(['AVAILABLE', 'LIMITED', 'SATURATED', 'INACTIVE'])
  @IsOptional()
  operating_status?: string;
}

export class UpdateWorkshopDto extends PartialType(CreateWorkshopDto) {}
