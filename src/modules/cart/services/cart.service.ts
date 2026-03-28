import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AddCartItemDto, MergeCartDto, UpdateCartItemDto } from '../dto';
import { Cart, CartDocument } from '../schemas';

@Injectable()
export class CartService {
	constructor(
		@InjectModel(Cart.name)
		private readonly cartModel: Model<CartDocument>,
	) {}

	private async getOrCreateCart(authId: string): Promise<CartDocument> {
		let cart = await this.cartModel.findOne({ auth_id: authId });
		if (!cart) {
			cart = await this.cartModel.create({ auth_id: authId, items: [] });
		}
		return cart;
	}

	private findItemIndex(
		items: Array<{ productId: string; size: string; color: string }>,
		payload: { productId: string; size: string; color: string },
	) {
		return items.findIndex(
			(item) =>
				item.productId === payload.productId &&
				item.size === payload.size &&
				item.color === payload.color,
		);
	}

	async getCart(authId: string) {
		const cart = await this.getOrCreateCart(authId);
		return { items: cart.items ?? [] };
	}

	async addItem(authId: string, dto: AddCartItemDto) {
		const cart = await this.getOrCreateCart(authId);
		const index = this.findItemIndex(cart.items, dto);

		if (index >= 0) {
			cart.items[index].quantity += dto.quantity;
		} else {
			cart.items.push({
				productId: dto.productId,
				name: dto.name,
				price: dto.price,
				quantity: dto.quantity,
				size: dto.size,
				color: dto.color,
				image: dto.image ?? null,
			} as any);
		}

		await cart.save();
		return { items: cart.items };
	}

	async updateItem(authId: string, dto: UpdateCartItemDto) {
		const cart = await this.getOrCreateCart(authId);
		const index = this.findItemIndex(cart.items, dto);

		if (index < 0) {
			throw new NotFoundException('Item de carrito no encontrado');
		}

		if (dto.quantity <= 0) {
			cart.items.splice(index, 1);
		} else {
			cart.items[index].quantity = dto.quantity;
		}

		await cart.save();
		return { items: cart.items };
	}

	async removeItem(authId: string, dto: Pick<UpdateCartItemDto, 'productId' | 'size' | 'color'>) {
		const cart = await this.getOrCreateCart(authId);
		const index = this.findItemIndex(cart.items, dto);

		if (index >= 0) {
			cart.items.splice(index, 1);
			await cart.save();
		}

		return { items: cart.items };
	}

	async mergeCart(authId: string, dto: MergeCartDto) {
		const cart = await this.getOrCreateCart(authId);

		for (const localItem of dto.items ?? []) {
			const index = this.findItemIndex(cart.items, localItem);

			if (index >= 0) {
				cart.items[index].quantity += localItem.quantity;
			} else {
				cart.items.push({
					productId: localItem.productId,
					name: localItem.name,
					price: localItem.price,
					quantity: localItem.quantity,
					size: localItem.size,
					color: localItem.color,
					image: localItem.image ?? null,
				} as any);
			}
		}

		await cart.save();
		return { items: cart.items };
	}
}

