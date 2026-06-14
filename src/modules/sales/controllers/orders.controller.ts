import { Controller, Get, Patch, UseGuards, Req, Param, BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesService } from '../services/sales.service';
import { FirebaseAuthGuard } from '../../../auth/guards/firebase-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly salesService: SalesService) {}

  @Get('client/active')
  @UseGuards(FirebaseAuthGuard)
  async getActiveOrders(@Req() req: any) {
    const userId = req.user.uid; // From FirebaseAuthGuard mapping
    return await this.salesService.getActiveOrders(userId);
  }

  @Get('client/history')
  @UseGuards(FirebaseAuthGuard)
  async getHistoryOrders(@Req() req: any) {
    const userId = req.user.uid;
    return await this.salesService.getHistoryOrders(userId);
  }

  @Get('client/:id')
  @UseGuards(FirebaseAuthGuard)
  async getOrderById(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.uid;
    return await this.salesService.getOrderById(id, userId);
  }

  @Patch('client/:id/confirm-delivery')
  @UseGuards(FirebaseAuthGuard)
  async confirmDelivery(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.uid;
    try {
      return await this.salesService.confirmDelivery(id, userId);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }
}
