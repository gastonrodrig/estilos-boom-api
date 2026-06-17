import { Controller, Post, Get, Body, Param, Req, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ReviewsService } from '../services';
import { CreateReviewDto } from '../dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product review' })
  async create(@Req() req: any, @Body() createReviewDto: CreateReviewDto) {
    const userId = req.user?.id || req.user?.uid;
    return this.reviewsService.create(userId, createReviewDto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get paginated reviews for a product' })
  async findByProduct(
    @Param('productId') productId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.findByProduct(productId, page, limit);
  }

  @Get('user/pending')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending reviews for the logged-in user' })
  async getPendingReviews(@Req() req: any) {
    const userId = req.user?.id || req.user?.uid;
    return this.reviewsService.getPendingReviews(userId);
  }

  @Get('user/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reviews created by the logged-in user' })
  async findByUser(@Req() req: any) {
    const userId = req.user?.id || req.user?.uid;
    return this.reviewsService.findByUser(userId);
  }
}
