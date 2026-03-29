import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AddCartItemDto, MergeCartDto, UpdateCartItemDto } from "../dto";
import { Cart, CartDocument } from "../schemas";
import {
  Product,
  ProductDocument,
  ProductVariant,
  ProductVariantDocument,
} from "../../product/schemas";

type CartItemIdentity = {
  productId: string;
  size: string;
  color: string;
};

type CartItemSnapshot = CartItemIdentity & {
  name: string;
  price: number;
  quantity: number;
  image: string | null;
};

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private readonly productVariantModel: Model<ProductVariantDocument>,
  ) {}

  private async getOrCreateCart(authId: string): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({ auth_id: authId });
    if (!cart) {
      cart = await this.cartModel.create({ auth_id: authId, items: [] });
    }
    return cart;
  }

  private findItemIndex(items: CartItemIdentity[], payload: CartItemIdentity) {
    return items.findIndex(
      (item) =>
        item.productId === payload.productId &&
        item.size === payload.size &&
        item.color === payload.color,
    );
  }

  private async resolveProductSnapshot(
    productId: string,
    size: string,
    color: string,
  ) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new NotFoundException("Producto no encontrado");
    }

    const product = await this.productModel.findById(productId).lean();
    if (!product || !product.is_active) {
      throw new NotFoundException("Producto no encontrado");
    }

    const variant = await this.productVariantModel
      .findOne({
        id_product: new Types.ObjectId(productId),
        size,
        color,
      })
      .lean();

    if (!variant) {
      throw new NotFoundException("Variante no encontrada");
    }

    return {
      name: product.name,
      price: Number(product.base_price ?? 0),
      image:
        Array.isArray(product.images) && product.images.length > 0
          ? product.images[0]
          : null,
      stock: Number(variant.stock ?? 0),
    };
  }

  private buildCartItemSnapshot(
    dto: CartItemIdentity & { quantity: number },
    snapshot: { name: string; price: number; image: string | null; stock: number },
  ): CartItemSnapshot {
    return {
      productId: dto.productId,
      name: snapshot.name,
      price: snapshot.price,
      quantity: Math.min(dto.quantity, snapshot.stock),
      size: dto.size,
      color: dto.color,
      image: snapshot.image,
    };
  }

  async getCart(authId: string) {
    const cart = await this.getOrCreateCart(authId);
    return { items: cart.items ?? [] };
  }

  async addItem(authId: string, dto: AddCartItemDto) {
    const cart = await this.getOrCreateCart(authId);
    const index = this.findItemIndex(cart.items, dto);
    const snapshot = await this.resolveProductSnapshot(
      dto.productId,
      dto.size,
      dto.color,
    );

    if (snapshot.stock <= 0) {
      throw new BadRequestException("Sin stock disponible para esta variante");
    }

    if (index >= 0) {
      const desiredQty = cart.items[index].quantity + dto.quantity;
      cart.items[index].quantity = Math.min(desiredQty, snapshot.stock);
      cart.items[index].name = snapshot.name;
      cart.items[index].price = snapshot.price;
      cart.items[index].image = snapshot.image;
    } else {
      cart.items.push(this.buildCartItemSnapshot(dto, snapshot) as any);
    }

    await cart.save();
    return { items: cart.items };
  }

  async updateItem(authId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(authId);
    const index = this.findItemIndex(cart.items, dto);

    if (index < 0) {
      throw new NotFoundException("Item de carrito no encontrado");
    }

    if (dto.quantity <= 0) {
      cart.items.splice(index, 1);
    } else {
      const snapshot = await this.resolveProductSnapshot(
        dto.productId,
        dto.size,
        dto.color,
      );

      if (snapshot.stock <= 0) {
        throw new BadRequestException("Sin stock disponible para esta variante");
      }

      cart.items[index].quantity = Math.min(dto.quantity, snapshot.stock);
      cart.items[index].name = snapshot.name;
      cart.items[index].price = snapshot.price;
      cart.items[index].image = snapshot.image;
    }

    await cart.save();
    return { items: cart.items };
  }

  async removeItem(
    authId: string,
    dto: Pick<UpdateCartItemDto, "productId" | "size" | "color">,
  ) {
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
      try {
        const snapshot = await this.resolveProductSnapshot(
          localItem.productId,
          localItem.size,
          localItem.color,
        );

        if (snapshot.stock <= 0) continue;

        const index = this.findItemIndex(cart.items, localItem);

        if (index >= 0) {
          const desiredQty = cart.items[index].quantity + localItem.quantity;
          cart.items[index].quantity = Math.min(desiredQty, snapshot.stock);
          cart.items[index].name = snapshot.name;
          cart.items[index].price = snapshot.price;
          cart.items[index].image = snapshot.image;
        } else {
          cart.items.push(
            this.buildCartItemSnapshot(
              {
                productId: localItem.productId,
                quantity: localItem.quantity,
                size: localItem.size,
                color: localItem.color,
              },
              snapshot,
            ) as any,
          );
        }
      } catch {
        // Si un item no existe o falla validación, no abortamos todo el merge.
        continue;
      }
    }

    await cart.save();
    return { items: cart.items };
  }
}