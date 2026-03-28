import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Patch,
	Post,
	Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CartService } from '../services';
import { AddCartItemDto, MergeCartDto, UpdateCartItemDto } from '../dto';

@Controller('cart')
export class CartController {
	constructor(private readonly cartService: CartService) {}

	private getAuthId(req: Request): string {
		const authId = (req as any)?.user?.uid;
		if (!authId) {
			throw new Error('Auth uid no encontrado en request.user');
		}
		return authId;
	}

	@Get()
	getCart(@Req() req: Request) {
		const authId = this.getAuthId(req);
		return this.cartService.getCart(authId);
	}

	@Post('items')
	addItem(@Req() req: Request, @Body() dto: AddCartItemDto) {
		const authId = this.getAuthId(req);
		return this.cartService.addItem(authId, dto);
	}

	@Patch('items')
	updateItem(@Req() req: Request, @Body() dto: UpdateCartItemDto) {
		const authId = this.getAuthId(req);
		return this.cartService.updateItem(authId, dto);
	}

	@Delete('items')
	@HttpCode(200)
	removeItem(
		@Req() req: Request,
		@Body() dto: Pick<UpdateCartItemDto, 'productId' | 'size' | 'color'>,
	) {
		const authId = this.getAuthId(req);
		return this.cartService.removeItem(authId, dto);
	}

	@Post('merge')
	merge(@Req() req: Request, @Body() dto: MergeCartDto) {
		const authId = this.getAuthId(req);
		return this.cartService.mergeCart(authId, dto);
	}
}

