import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentManualTransaction, PaymentManualTransactionDocument } from '../../payment-manual/schemas/payment-manual-transaction.schema';
import { MercadoPagoTransaction, MercadoPagoTransactionDocument } from '../../mercadopago/schemas/mercadopago-transaction.schema';
import { UnifiedPaymentMapper } from '../mappers/unified-payment.mapper';
import { UnifiedPaymentDto } from '../dto/unified-payment.dto';

@Injectable()
export class AdminPaymentsService {
  constructor(
    @InjectModel(PaymentManualTransaction.name) private manualModel: Model<PaymentManualTransactionDocument>,
    @InjectModel(MercadoPagoTransaction.name) private mpModel: Model<MercadoPagoTransactionDocument>,
  ) {}

  async getPayments(): Promise<UnifiedPaymentDto[]> {
    const [manuals, mps] = await Promise.all([
      this.manualModel.find().populate('userId orderId').lean().exec(),
      this.mpModel.find().populate('userId orderId').lean().exec(),
    ]);

    const mappedManuals = manuals.map((m) => UnifiedPaymentMapper.mapManual(m));
    const mappedMps = mps.map((m) => UnifiedPaymentMapper.mapMercadoPago(m));

    const combined = [...mappedManuals, ...mappedMps];
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return combined;
  }

  async getSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [manuals, mps] = await Promise.all([
      this.manualModel.find().lean().exec(),
      this.mpModel.find().lean().exec(),
    ]);

    let pending = 0;
    let verifiedToday = 0;
    let rejected = 0;
    let totalVerifiedAmount = 0;

    const countManuals = (m: any) => {
      if (m.status === 'pending_validation') pending++;
      else if (m.status === 'rejected') rejected++;
      else if (m.status === 'approved') {
        totalVerifiedAmount += m.amount;
        if (new Date(m.updatedAt) >= today) verifiedToday++;
      }
    };

    const countMps = (m: any) => {
      if (m.status === 'pending') pending++;
      else if (m.status === 'rejected') rejected++;
      else if (m.status === 'approved') {
        totalVerifiedAmount += m.amount;
        if (new Date(m.updated_at || m.createdAt) >= today) verifiedToday++;
      }
    };

    manuals.forEach(countManuals);
    mps.forEach(countMps);

    return {
      pending,
      verified_today: verifiedToday,
      rejected,
      total_verified_amount: totalVerifiedAmount,
    };
  }

  async confirmManualPayment(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('ID de pago inválido');
    const payment = await this.manualModel.findById(id);
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== 'pending_validation') {
      throw new BadRequestException('Solo se pueden confirmar pagos pendientes');
    }

    // Comprobar si operationNumber ya existe como aprobado
    const duplicate = await this.manualModel.findOne({
      _id: { $ne: id },
      operationNumber: payment.operationNumber,
      status: 'approved',
    });

    if (duplicate) {
      throw new BadRequestException('El número de operación ya fue usado en otro pago aprobado');
    }

    payment.status = 'approved';
    await payment.save();

    // TODO: Cuando exista el módulo de pedidos/ventas, actualizar aquí el estado del pedido asociado.
    // Ejemplo: await this.orderModel.findByIdAndUpdate(payment.orderId, { status: 'PAID' }).exec();

    return { success: true, message: 'Pago verificado exitosamente' };
  }

  async rejectManualPayment(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('ID de pago inválido');
    const payment = await this.manualModel.findById(id);
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== 'pending_validation') {
      throw new BadRequestException('Solo se pueden rechazar pagos pendientes');
    }

    payment.status = 'rejected';
    await payment.save();

    // TODO: Cuando exista el módulo de pedidos/ventas, actualizar aquí el estado del pedido asociado (ej. a REJECTED o PENDING_PAYMENT).

    return { success: true, message: 'Pago rechazado exitosamente' };
  }
}
