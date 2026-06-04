import { IsString, IsNumber, IsOptional, ValidateNested, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  issuer_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  payment_method_id: string;

  @ApiProperty()
  @IsNumber()
  transaction_amount: number;

  @ApiProperty()
  @IsNumber()
  installments: number;

  @ApiProperty()
  @IsObject()
  payer: any;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  items?: any[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deliveryMethod?: string;
}
