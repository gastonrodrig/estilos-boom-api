import { Controller, Get, UseGuards, Patch, Param, Body } from '@nestjs/common';
import { SalesService } from '../services/sales.service';
import { FirebaseAuthGuard } from '../../../auth/guards/firebase-auth.guard';

@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @UseGuards(FirebaseAuthGuard)
  async getAdminOrders() {
    // Aquí podríamos validar que el usuario tiene rol de ADMIN
    return await this.salesService.getAdminOrders();
  }

  @Patch(':id/status')
  @UseGuards(FirebaseAuthGuard)
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    // Validar rol de ADMIN
    return await this.salesService.updateOrderStatus(id, status);
  }
}
