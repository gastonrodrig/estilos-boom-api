import { IsString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { client_type_enum, document_type_enum } from '@prisma/client';

export class UpdateExtraDataDto {
  @ApiProperty({ enum: client_type_enum, example: client_type_enum.Persona })
  @IsEnum(client_type_enum)
  @IsNotEmpty()
  client_type: client_type_enum;
  
  @ApiProperty()
  @IsString()
  @IsOptional()
  first_name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  last_name: string;
  
  @ApiProperty()
  @IsString()
  @IsOptional()
  company_name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  contact_person: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsEnum(document_type_enum)
  @IsNotEmpty()
  document_type: document_type_enum;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  document_number: string;
}
