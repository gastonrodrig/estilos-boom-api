import { IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Min } from "class-validator";

export class AddCartItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  size: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsString()
  @IsOptional()
  image?: string;
}