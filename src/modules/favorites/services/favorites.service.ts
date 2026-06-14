import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Favorite } from '../schemas';
import { CreateFavoriteDto } from '../dto';
import { User, UserDocument } from '../../user/schemas/user.schema';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(Favorite.name) private favoriteModel: Model<Favorite>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private async resolveUserObjectId(userId: string): Promise<Types.ObjectId> {
    if (Types.ObjectId.isValid(userId)) {
      return new Types.ObjectId(userId);
    }
    const user = await this.userModel.findOne({ auth_id: userId }).exec();
    if (user) {
      return user._id as Types.ObjectId;
    }
    // Fallback to a default ObjectId if not found in db
    return new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d1');
  }

  async create(userId: string, createFavoriteDto: CreateFavoriteDto): Promise<Favorite> {
    try {
      const userObjectId = await this.resolveUserObjectId(userId);
      const newFavorite = new this.favoriteModel({
        userId: userObjectId,
        productId: new Types.ObjectId(createFavoriteDto.productId),
      });
      return await newFavorite.save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('Product is already in your favorites');
      }
      throw error;
    }
  }

  async findAllByUser(userId: string): Promise<Favorite[]> {
    const userObjectId = await this.resolveUserObjectId(userId);
    return this.favoriteModel
      .find({ userId: userObjectId })
      .populate('productId')
      .exec();
  }

  async remove(userId: string, productId: string): Promise<void> {
    const userObjectId = await this.resolveUserObjectId(userId);
    const result = await this.favoriteModel.deleteOne({
      userId: userObjectId,
      productId: new Types.ObjectId(productId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Favorite not found');
    }
  }
}
