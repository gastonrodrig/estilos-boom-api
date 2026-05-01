// create-supplier.dto.ts
import { IsString, IsEmail, IsNotEmpty, IsOptional, Matches, IsBoolean } from 'class-validator';

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

  @Matches(/^[+]?[0-9\s\-()]{6,}$/, { message: 'Teléfono inválido' })
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}

