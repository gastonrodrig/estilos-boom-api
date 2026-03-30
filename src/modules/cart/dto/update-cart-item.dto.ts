import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpdateCartItemDto {
	@IsString()
	@IsNotEmpty()
	productId: string;

	@IsString()
	@IsNotEmpty()
	size: string;

	@IsString()
	@IsNotEmpty()
	color: string;

	@IsInt()
	@Min(0)
	quantity: number;
}

