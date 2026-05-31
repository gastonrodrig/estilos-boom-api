import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class ProcessManualPaymentDto {
  @IsString()
  @IsOptional()
  orderId?: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  @IsNotEmpty()
  operationNumber: string;
}
