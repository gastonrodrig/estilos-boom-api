import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddCartItemDto {
	@IsString()
	@IsNotEmpty()
	productId: string;

	@IsString()
	@IsNotEmpty()
	name: string;

	@IsNumber()
	@Min(0)
	price: number;

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
