import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review } from '../schemas';
import { CreateReviewDto } from '../dto';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { Order, OrderDocument } from '../../sales/schemas/order.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  private async resolveUserObjectId(userId: string): Promise<Types.ObjectId> {
    if (Types.ObjectId.isValid(userId)) {
      return new Types.ObjectId(userId);
    }
    const user = await this.userModel.findOne({ auth_id: userId }).exec();
    if (user) {
      return user._id as Types.ObjectId;
    }
    // Fallback to default ObjectId
    return new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d1');
  }

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    const userObjectId = await this.resolveUserObjectId(userId);
    const existingReview = await this.reviewModel.findOne({
      userId: userObjectId,
      productId: new Types.ObjectId(createReviewDto.productId),
      orderId: new Types.ObjectId(createReviewDto.orderId),
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product for this order.');
    }

    const newReview = new this.reviewModel({
      userId: userObjectId,
      productId: new Types.ObjectId(createReviewDto.productId),
      orderId: new Types.ObjectId(createReviewDto.orderId),
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
    });

    return await newReview.save();
  }

  async findByProduct(productId: string, page: number = 1, limit: number = 10): Promise<{ data: Review[], total: number }> {
    const skip = (page - 1) * limit;
    const query = { productId: new Types.ObjectId(productId) };

    const [data, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .populate('userId', 'first_name last_name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(query)
    ]);

    return { data, total };
  }

  async findByUser(userId: string): Promise<Review[]> {
    const userObjectId = await this.resolveUserObjectId(userId);
    return this.reviewModel
      .find({ userId: userObjectId })
      .populate('productId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPendingReviews(userId: string): Promise<any[]> {
    const userObjectId = await this.resolveUserObjectId(userId);

    const orders = await this.orderModel.find({
      userId: userObjectId,
      status: 'DELIVERED',
    }).exec();

    const pendingItems = [];

    for (const order of orders) {
      if (!order.items) continue;

      for (const item of order.items) {
        if (!item.id || !Types.ObjectId.isValid(item.id)) continue;

        const reviewExists = await this.reviewModel.exists({
          userId: userObjectId,
          productId: new Types.ObjectId(item.id),
          orderId: order._id,
        });

        if (!reviewExists) {
          pendingItems.push({
            id: item.id,
            name: item.name || 'Producto',
            size: item.size || 'N/A',
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            deliveryDate: (order as any).updatedAt || new Date(),
            image: item.imageUrl || item.image || '/assets/product/vestido-corto-floral-cuello-v.png',
          });
        }
      }
    }

    return pendingItems;
  }
}
