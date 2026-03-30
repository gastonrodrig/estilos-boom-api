import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { AddCartItemDto } from './add-cart-item.dto';

export class MergeCartDto {
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => AddCartItemDto)
	items: AddCartItemDto[];
}

