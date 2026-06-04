import { Controller, Get, UseGuards, Req, Param } from '@nestjs/common';
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

  @Get('client/:id')
  @UseGuards(FirebaseAuthGuard)
  async getOrderById(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.uid;
    return await this.salesService.getOrderById(id, userId);
  }
}
