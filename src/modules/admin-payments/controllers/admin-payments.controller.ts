import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { AdminPaymentsService } from '../services/admin-payments.service';

@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly adminPaymentsService: AdminPaymentsService) {}

  @Get()
  async getAll() {
    return this.adminPaymentsService.getPayments();
  }

  @Get('summary')
  async getSummary() {
    return this.adminPaymentsService.getSummary();
  }

  @Patch('manual/:id/confirm')
  async confirm(@Param('id') id: string) {
    return this.adminPaymentsService.confirmManualPayment(id);
  }

  @Patch('manual/:id/reject')
  async reject(@Param('id') id: string, @Body('observationMessage') observationMessage?: string) {
    return this.adminPaymentsService.rejectManualPayment(id, observationMessage);
  }
}
