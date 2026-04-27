// create-supplier.dto.ts
import { IsString, IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  name_company: string;

  @IsString()
  @IsNotEmpty()
  ruc: string;

  @IsString()
  @IsOptional()
  contact_person?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsPhoneNumber('PE') // 'PE' para validar formato de Perú, por ejemplo
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;
}

