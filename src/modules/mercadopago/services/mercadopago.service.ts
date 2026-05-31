import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MercadoPagoTransactionDocument } from '../schemas/mercadopago-transaction.schema';
import { CreatePreferenceDto } from '../dto/create-preference.dto';
import { ProcessPaymentDto } from '../dto/process-payment.dto';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly client: MercadoPagoConfig;

  constructor(
    @InjectModel('MercadoPagoTransaction') private transactionModel: Model<MercadoPagoTransactionDocument>,
    private readonly configService: ConfigService,
  ) {
    this.client = new MercadoPagoConfig({
      accessToken: this.configService.get<string>('MP_ACCESS_TOKEN') || '',
      options: { timeout: 5000 }
    });
  }

  async createPreference(dto: CreatePreferenceDto, userId: string) {
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    this.logger.log(`[DEBUG] MP_ACCESS_TOKEN existe: ${!!accessToken}`);
    this.logger.log(`[DEBUG] Body recibido para preferencia: ${JSON.stringify(dto)}`);
    
    try {
      const mpClient = new MercadoPagoConfig({
        accessToken: accessToken || '',
        options: { timeout: 5000 }
      });
      const preference = new Preference(mpClient);

      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';

      const response = await preference.create({
        body: {
          items: dto.items,
          external_reference: dto.orderId,
          payer: {
            email: dto.payerEmail || 'guest@example.com',
          },
          back_urls: {
            success: `${appUrl}/checkout/success`,
            failure: `${appUrl}/checkout/failure`,
            pending: `${appUrl}/checkout/pending`,
          },
        }
      });

      return {
        preferenceId: response.id,
      };
    } catch (error: any) {
      this.logger.error('Error creating MercadoPago preference', error);
      if (error.response) {
        this.logger.error('MercadoPago Error Data:', error.response);
        throw new InternalServerErrorException({ message: 'Error de MercadoPago', details: error.response });
      }
      if (error.cause) {
        this.logger.error('MercadoPago Error Cause:', error.cause);
      }
      throw new InternalServerErrorException({ message: 'No se pudo crear la preferencia de pago', details: error.message });
    }
  }

  async processPayment(dto: ProcessPaymentDto, userId: string) {
    try {
      const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
      const mpClient = new MercadoPagoConfig({
        accessToken: accessToken || '',
        options: { timeout: 5000 }
      });
      const payment = new Payment(mpClient);
      
      // Build the payment body
      const body: any = {
        transaction_amount: dto.transaction_amount,
        token: dto.token,
        description: 'Compra en Estilos Boom',
        installments: dto.installments,
        payment_method_id: dto.payment_method_id,
        issuer_id: dto.issuer_id,
        payer: {
          email: dto.payer.email,
          identification: dto.payer.identification,
        },
        external_reference: dto.orderId,
      };

      const response = await payment.create({ body });

      // Save to database
      const newTransaction = new this.transactionModel({
        userId: new Types.ObjectId(userId),
        orderId: dto.orderId ? new Types.ObjectId(dto.orderId) : new Types.ObjectId(),
        amount: response.transaction_amount,
        currency: response.currency_id,
        status: response.status,
        statusDetail: response.status_detail,
        paymentId: response.id?.toString(),
        paymentMethodId: response.payment_method_id,
        paymentTypeId: response.payment_type_id,
        payerEmail: response.payer?.email,
        externalReference: response.external_reference,
        rawResponse: {
          id: response.id,
          status: response.status,
          status_detail: response.status_detail,
          date_created: response.date_created,
          date_approved: response.date_approved,
          payment_method_id: response.payment_method_id,
          payment_type_id: response.payment_type_id,
        },
      });

      await newTransaction.save();

      return {
        status: response.status,
        status_detail: response.status_detail,
        id: response.id,
      };
    } catch (error) {
      this.logger.error('Error processing MercadoPago payment', error);
      throw new InternalServerErrorException('Error al procesar el pago');
    }
  }

  async handleWebhook(body: any) {
    this.logger.log(`Webhook received: ${JSON.stringify(body)}`);
    
    try {
      if (body.type === 'payment') {
        const paymentId = body.data.id;
        const paymentClient = new Payment(this.client);
        
        const paymentInfo = await paymentClient.get({ id: paymentId });
        
        if (paymentInfo) {
          // Find transaction and update status
          await this.transactionModel.findOneAndUpdate(
            { paymentId: paymentId.toString() },
            {
              status: paymentInfo.status,
              statusDetail: paymentInfo.status_detail,
              updated_at: new Date(),
            }
          );
        }
      }
      return { success: true };
    } catch (error) {
      this.logger.error('Error handling webhook', error);
      throw new InternalServerErrorException('Error processing webhook');
    }
  }
}
