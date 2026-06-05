import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Favorite } from '../schemas';
import { CreateFavoriteDto } from '../dto';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(Favorite.name) private favoriteModel: Model<Favorite>,
  ) {}

  async create(userId: string, createFavoriteDto: CreateFavoriteDto): Promise<Favorite> {
    try {
      const newFavorite = new this.favoriteModel({
        userId: new Types.ObjectId(userId),
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
    return this.favoriteModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('productId')
      .exec();
  }

  async remove(userId: string, productId: string): Promise<void> {
    const result = await this.favoriteModel.deleteOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Favorite not found');
    }
  }
}
