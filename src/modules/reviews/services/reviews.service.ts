import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review } from '../schemas';
import { CreateReviewDto } from '../dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<Review>,
  ) {}

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    const existingReview = await this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(createReviewDto.productId),
      orderId: new Types.ObjectId(createReviewDto.orderId),
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product for this order.');
    }

    const newReview = new this.reviewModel({
      userId: new Types.ObjectId(userId),
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
    return this.reviewModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('productId')
      .sort({ createdAt: -1 })
      .exec();
  }
}
