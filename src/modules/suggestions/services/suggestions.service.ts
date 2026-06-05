import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Suggestion } from '../schemas';
import { CreateSuggestionDto } from '../dto';

@Injectable()
export class SuggestionsService {
  constructor(
    @InjectModel(Suggestion.name) private suggestionModel: Model<Suggestion>,
    // Using string keys to avoid circular dependency / tight coupling if not needed, 
    // but the models must be registered in the module.
    @InjectModel('Favorite') private favoriteModel: Model<any>,
    @InjectModel('Order') private orderModel: Model<any>,
    @InjectModel('Product') private productModel: Model<any>,
  ) {}

  async create(userId: string, createDto: CreateSuggestionDto): Promise<Suggestion> {
    const newSuggestion = new this.suggestionModel({
      userId: new Types.ObjectId(userId),
      category: createDto.category,
      productId: createDto.productId ? new Types.ObjectId(createDto.productId) : undefined,
      sizeRequested: createDto.sizeRequested,
      colorSuggested: createDto.colorSuggested,
      message: createDto.message,
    });
    return await newSuggestion.save();
  }

  async findByUser(userId: string): Promise<Suggestion[]> {
    return this.suggestionModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('productId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getInteractionProducts(userId: string, page: number = 1, limit: number = 6) {
    const userObjectId = new Types.ObjectId(userId);

    // 1. Get favorite product IDs
    const favorites = await this.favoriteModel.find({ userId: userObjectId }, { productId: 1 }).exec();
    const favoriteProductIds = favorites.map(f => f.productId.toString());

    // 2. Get ordered product IDs
    const orders = await this.orderModel.find({ 'customer.user_id': userId }).exec();
    const orderedProductIds: string[] = [];
    orders.forEach(order => {
      if (order.items) {
        order.items.forEach((item: any) => {
          if (item.product_id) orderedProductIds.push(item.product_id.toString());
        });
      }
    });

    // 3. Merge and make unique
    const allInteractionIds = Array.from(new Set([...favoriteProductIds, ...orderedProductIds]));
    
    // Convert back to ObjectId
    const objectIds = allInteractionIds.map(id => new Types.ObjectId(id));

    // 4. Paginate and fetch full product details
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.productModel.find({ _id: { $in: objectIds } })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments({ _id: { $in: objectIds } })
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}
