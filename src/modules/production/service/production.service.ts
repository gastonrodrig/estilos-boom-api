import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Twilio, twiml } from 'twilio';
import { ProductionOrder, ProductionOrderDocument } from '../schema/production-order.schema';
import { CreateProductionOrderDto } from '../dto/create-production-order.dto';
import { UpdateWorkshopQuoteDto } from '../dto/update-workshop-quote.dto';
import { WorkshopService } from '../../workshop/service/workshop.service';

@Injectable()
export class ProductionService {
  private twilioClient: Twilio;
  private readonly logger = new Logger(ProductionService.name);

  constructor(
    @InjectModel(ProductionOrder.name) private productionOrderModel: Model<ProductionOrderDocument>,
    private configService: ConfigService,
    private workshopService: WorkshopService,
  ) {
    // Leemos las variables usando ConfigService en lugar de process.env
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.twilioClient = new Twilio(accountSid, authToken);
    } else {
      this.logger.error('⚠️ Faltan las credenciales de Twilio en el archivo .env');
    }
  }

  async create(createDto: CreateProductionOrderDto): Promise<ProductionOrder> {
    const { base_items, workshop_ids, id_worker, supplies, observations, delivery_date_estimated } = createDto;

    const initialQuotes = workshop_ids.map(id => ({
      id_agent: new Types.ObjectId(id),
      items: base_items.map(item => ({ ...item, unit_cost: 0 })),
      total_amount: 0,
      quote_status: 'PENDIENTE'
    }));

    const orderNumberStr = Date.now().toString().slice(-6);

    const productionOrder = new this.productionOrderModel({
      pre_order_number: `OPP-M-2026-${orderNumberStr}`,
      order_number: `OP-2026-${orderNumberStr}`,
      id_worker,
      base_items,
      supplies: supplies || [],
      quotes: initialQuotes,
      observations,
      delivery_date_estimated,
      status: 'CONTACTO_INICIAL',
      history: [{ status: 'CONTACTO_INICIAL', date: new Date() }],
      sub_states: []
    });

    return productionOrder.save();
  }

  async findAll() {
    return this.productionOrderModel
      .find()
      .populate('quotes.id_agent')
      .populate('id_worker')
      .populate('id_winner_workshop')
      .populate({
        path: 'base_items.id_variant',
        populate: { path: 'id_product' }
      })
      .sort({ created_at: -1 })
      .exec();
  }

  async findOne(id: string): Promise<ProductionOrder> {
    const order = await this.productionOrderModel.findById(id)
      .populate('quotes.id_agent')
      .populate('id_worker')
      .populate('id_winner_workshop')
      .populate({
        path: 'base_items.id_variant',
        populate: { path: 'id_product' }
      })
      .exec();
    
    if (!order) throw new NotFoundException('Orden de producción no encontrada');
    return order;
  }

  async updateQuote(id: string, updateDto: UpdateWorkshopQuoteDto): Promise<ProductionOrder> {
    const order = await this.productionOrderModel.findById(id);
    if (!order) throw new NotFoundException('Orden de producción no encontrada');

    const quoteIndex = order.quotes.findIndex(q => q.id_agent.toString() === updateDto.id_workshop);
    if (quoteIndex === -1) throw new BadRequestException('El taller no está invitado a esta orden');

    const totalAmount = updateDto.items.reduce((acc, it) => acc + (it.quantity * (it.unit_cost || 0)), 0);

    order.quotes[quoteIndex].items = updateDto.items as any;
    order.quotes[quoteIndex].total_amount = totalAmount;
    
    if (order.status === 'CONTACTO_INICIAL') {
      order.status = 'COMPARANDO';
      order.history.push({ status: 'COMPARANDO', date: new Date() });
    }

    await order.save();
    return this.findOne(id);
  }

  async confirmWorkshop(id: string, workshopId: string): Promise<ProductionOrder> {
    const order = await this.productionOrderModel.findById(id);
    if (!order) throw new NotFoundException('Orden de producción no encontrada');

    const winnerQuote = order.quotes.find(q => q.id_agent.toString() === workshopId);
    if (!winnerQuote) throw new BadRequestException('Cotización del taller no encontrada');

    order.quotes.forEach(q => {
      q.quote_status = q.id_agent.toString() === workshopId ? 'SELECCIONADO' : 'RECHAZADO';
    });

    order.id_winner_workshop = new Types.ObjectId(workshopId);
    order.total_amount = winnerQuote.total_amount;
    order.status = 'EN_PRODUCCION';
    order.history.push({ status: 'EN_PRODUCCION', date: new Date() });

    // ========================================================
    // INTEGRACIÓN TWILIO: INICIO DE BOT DE SEGUIMIENTO
    // ========================================================
    const workshop = await this.workshopService.findOne(workshopId);
    order.workshopPhone = workshop.phone;
    order.botState = 'AWAITING_CORTE';

    if (!order.chatHistory) order.chatHistory = [];
    if (!order.progress) order.progress = { corteIniciado: false, costuraIniciada: false };

    const totalUnidades = order.base_items.reduce((acc, item) => acc + item.quantity, 0);
    const welcomeMsg = `Hola, soy el asistente de Estilos Boom 👋\nTienen una orden activa:\n${totalUnidades} unidades — Orden ${order.order_number}.\n¿Ya comenzaron el corte?\nResponda SI o NO.`;

    order.chatHistory.push({ sender: 'bot', text: welcomeMsg, timestamp: new Date() });

    if (this.twilioClient) {
      const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      const toPhone = order.workshopPhone;

      if (!fromNumber) {
        this.logger.warn('⚠️ TWILIO_PHONE_NUMBER no configurada en .env. No se envió el mensaje.');
      } else if (!toPhone) {
        this.logger.warn(`⚠️ El taller ${workshopId} no tiene teléfono registrado. No se envió el mensaje.`);
      } else {
        try {
          await this.twilioClient.messages.create({
            from: `whatsapp:${fromNumber}`,
            to: `whatsapp:${toPhone}`,
            body: welcomeMsg
          });
        } catch (error) {
          const err = error as Error;
          this.logger.error('⚠️ Error al enviar mensaje por Twilio: ' + err.message);
        }
      }
    } else {
      this.logger.warn('⚠️ No se envió el mensaje de WhatsApp porque Twilio no está configurado.');
    }
    // ========================================================

    await order.save();
    return this.findOne(id);
  }

  async updateStatus(id: string, status: string): Promise<ProductionOrder> {
    const order = await this.productionOrderModel.findById(id);
    if (!order) throw new NotFoundException('Orden de producción no encontrada');

    order.status = status;
    order.history.push({ status, date: new Date() });

    if (status === 'CONTROL_CALIDAD') {
      await this.createWarehouseDocumentForProduction(order);
    }

    await order.save();

    return this.findOne(id);
  }

  async updateSubState(id: string, step: string): Promise<ProductionOrder> {
    const order = await this.productionOrderModel.findById(id);
    if (!order) throw new NotFoundException('Orden de producción no encontrada');

    if (!order.sub_states) order.sub_states = [];
    order.sub_states.push({ step, date: new Date() });

    if (step === 'ENTREGA') {
      order.status = 'CONTROL_CALIDAD';
      order.history.push({ status: 'CONTROL_CALIDAD', date: new Date() });
      await this.createWarehouseDocumentForProduction(order);
    }

    await order.save();
    return this.findOne(id);
  }

  // ========================================================
  // 🔥 NUEVO MÉTODO: MÁQUINA DE ESTADOS DEL WEBHOOK (TWILIO)
  // ========================================================
  async handleWhatsAppWebhook(body: any): Promise<string> {
    const MessagingResponse = twiml.MessagingResponse;
    const responseTwiml = new MessagingResponse();
    
    const incomingText = body.Body.trim().toUpperCase();
    const fromPhone = body.From.replace('whatsapp:', '');

    const order = await this.productionOrderModel.findOne({ 
      workshopPhone: fromPhone, 
      botState: { $nin: ['IDLE', 'COMPLETED'] } 
    });

    if (!order) {
      responseTwiml.message("No tienes órdenes activas o pendientes de actualización en este momento.");
      return responseTwiml.toString();
    }

    if (!order.chatHistory) order.chatHistory = [];
    if (!order.progress) order.progress = { corteIniciado: false, costuraIniciada: false };

    order.chatHistory.push({ sender: 'workshop', text: body.Body, timestamp: new Date() });
    let botReply = "";

    const totalUnidades = order.base_items.reduce((acc, item) => acc + item.quantity, 0);

    switch (order.botState) {
      case 'AWAITING_CORTE':
        if (incomingText === 'SI') {
          order.progress.corteIniciado = true;
          order.botState = 'AWAITING_COSTURA';
          botReply = "Gracias ✅\n¿Ya están en costura?\nResponda SI o NO.";
        } else if (incomingText === 'NO') {
          botReply = "Entendido 👍\nCuando comiencen el corte avísennos.\nLes volveremos a consultar más tarde.";
        } else {
          botReply = "No entendimos la respuesta.\nPor favor responda únicamente:\nSI o NO.";
        }
        break;

      case 'AWAITING_COSTURA':
        if (incomingText === 'SI') {
          order.progress.costuraIniciada = true;
          order.botState = 'AWAITING_UNIDADES';
          botReply = `Perfecto 🧵\n¿Cuántas unidades llevan listas?\nResponda solo el número (máximo ${totalUnidades}).`;
        } else if (incomingText === 'NO') {
          botReply = "Entendido 👍\nCuando inicien la costura avísennos.\nLes volveremos a consultar más tarde.";
        } else {
          botReply = "No entendimos la respuesta.\nPor favor responda únicamente:\nSI o NO.";
        }
        break;

      case 'AWAITING_UNIDADES':
      case 'AWAITING_UNIDADES_FINALES': {
        const unidades = parseInt(incomingText);
        if (isNaN(unidades) || unidades <= 0) {
          botReply = `Por favor responda solo con un número.\nEjemplo: ${totalUnidades}`;
        } else if (unidades > totalUnidades) {
          botReply = `La cantidad no es correcta ❌\nDeben reportar máximo ${totalUnidades} unidades (las acordadas).\n¿Cuántas unidades llevan listas?`;
        } else if (unidades === totalUnidades) {
          // Completaron todo — guardar fecha de hoy y pasar a CONTROL_CALIDAD
          const hoy = new Date();
          const dd = hoy.getDate().toString().padStart(2, '0');
          const mm = (hoy.getMonth() + 1).toString().padStart(2, '0');
          order.progress.unidadesListas = unidades;
          order.progress.fechaProyectadaFin = `${dd}/${mm}/${hoy.getFullYear()}`;
          order.botState = 'COMPLETED';
          order.status = 'CONTROL_CALIDAD';
          order.history.push({ status: 'CONTROL_CALIDAD', date: new Date() });
          await this.createWarehouseDocumentForProduction(order);
          botReply = `Excelente 🎉\n¡Todas las ${totalUnidades} unidades completadas!\nEl equipo coordinará la recepción.\n¡Gracias!`;
        } else {
          // Entrega parcial — preguntar fecha de finalización
          order.progress.unidadesListas = unidades;
          const nextState = order.botState === 'AWAITING_UNIDADES' ? 'AWAITING_FECHA_FIN' : 'AWAITING_NUEVA_FECHA_FIN';
          order.botState = nextState;
          botReply = `Entendido, ${unidades} de ${totalUnidades} ✅\n¿Para cuándo proyectan tener las ${totalUnidades - unidades} unidades restantes?\nResponda con fecha (ej: 20/06).`;
        }
        break;
      }

      case 'AWAITING_FECHA_FIN':
      case 'AWAITING_NUEVA_FECHA_FIN': {
        const parsed = this.parseDate(body.Body.trim());
        if (!parsed) {
          botReply = "Fecha no válida ❌\nPor favor use el formato DD/MM\nEjemplo: 20/06";
        } else {
          order.progress.fechaProyectadaFin = body.Body.trim();
          order.botState = 'AWAITING_ENTREGA';
          order.entregaCheckSent = false;
          botReply = `Anotado 📅\nLes escribiremos el ${body.Body.trim()} para confirmar que completaron las ${totalUnidades} unidades.\n¡Gracias!`;
        }
        break;
      }

      case 'AWAITING_ENTREGA':
        if (incomingText === 'SI') {
          // Guardar la fecha real de confirmación
          const hoyEntrega = new Date();
          const ddE = hoyEntrega.getDate().toString().padStart(2, '0');
          const mmE = (hoyEntrega.getMonth() + 1).toString().padStart(2, '0');
          order.progress.fechaProyectadaFin = `${ddE}/${mmE}/${hoyEntrega.getFullYear()}`;
          order.progress.unidadesListas = totalUnidades;
          order.botState = 'COMPLETED';
          order.status = 'CONTROL_CALIDAD';
          order.history.push({ status: 'CONTROL_CALIDAD', date: new Date() });
          await this.createWarehouseDocumentForProduction(order);
          botReply = `Excelente 🎉\n¡Todas las ${totalUnidades} unidades completadas!\nEl equipo coordinará la recepción.\n¡Gracias!`;
        } else if (incomingText === 'NO') {
          order.botState = 'AWAITING_UNIDADES_FINALES';
          botReply = `Entendido 👍\n¿Cuántas unidades tienen listas actualmente?\nResponda solo el número (máximo ${totalUnidades}).`;
        } else {
          botReply = "Por favor responda únicamente:\nSI o NO.";
        }
        break;
    }

    order.chatHistory.push({ sender: 'bot', text: botReply, timestamp: new Date() });
    await order.save();

    responseTwiml.message(botReply);
    return responseTwiml.toString();
  }

  // Corre cada día a las 8:00 AM — envía la consulta de entrega a talleres cuya fecha llegó
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkEntregaFollowUps(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await this.productionOrderModel.find({
      botState: 'AWAITING_ENTREGA',
      entregaCheckSent: { $ne: true },
    });

    for (const order of orders) {
      const fechaStr = order.progress?.fechaProyectadaFin;
      if (!fechaStr) continue;

      const proyectedDate = this.parseDate(fechaStr);
      if (!proyectedDate) continue;
      proyectedDate.setHours(0, 0, 0, 0);

      if (today < proyectedDate) continue;

      const totalUnidades = order.base_items.reduce((acc, item) => acc + item.quantity, 0);
      const msg = `Hola 👋\nHoy es el día acordado para la entrega.\n¿Completaron las ${totalUnidades} unidades de la Orden ${order.order_number}?\nResponda SI o NO.`;

      if (!order.chatHistory) order.chatHistory = [];
      order.chatHistory.push({ sender: 'bot', text: msg, timestamp: new Date() });
      order.entregaCheckSent = true;

      const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      const toPhone = order.workshopPhone;

      if (this.twilioClient && fromNumber && toPhone) {
        try {
          await this.twilioClient.messages.create({
            from: `whatsapp:${fromNumber}`,
            to: `whatsapp:${toPhone}`,
            body: msg,
          });
        } catch (error) {
          this.logger.error('Error en checkEntregaFollowUps: ' + (error as Error).message);
        }
      }

      await order.save();
    }
  }

  private parseDate(dateStr: string): Date | null {
    const match = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})(\/(\d{4}))?$/);
    if (!match) return null;

    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = match[4] ? parseInt(match[4]) : new Date().getFullYear();

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }

    return date;
  }

  private async createWarehouseDocumentForProduction(order: any) {
    try {
      const warehouseModel = this.productionOrderModel.db.model('Warehouse') as any;
      const warehouseDocModel = this.productionOrderModel.db.model('WarehouseDocument') as any;

      // 1. Obtener almacén central ALM-CEN
      const centralWarehouse = await warehouseModel.findOne({ code: 'ALM-CEN' }).exec();
      if (!centralWarehouse) {
        this.logger.warn('⚠️ Almacén central ALM-CEN no encontrado. No se pudo crear el documento de almacén.');
        return;
      }

      // 2. Generar el WarehouseDocument en estado PENDIENTE
      const documentItems = order.base_items.map(item => ({
        id_variant: item.id_variant?._id || item.id_variant,
        quantity_expected: Number(item.quantity),
        quantity_received: 0,
        incidence_note: ''
      }));

      // Evitar duplicados
      const existingDoc = await warehouseDocModel.findOne({
        id_origin_doc: order._id,
        type: 'INGRESO_PRODUCCION'
      }).exec();

      if (!existingDoc) {
        const docNumberStr = Date.now().toString().slice(-6);
        await warehouseDocModel.create({
          document_number: `PROD-${order.order_number || docNumberStr}`,
          type: 'INGRESO_PRODUCCION',
          status: 'PENDIENTE',
          id_source_warehouse: null,
          id_target_warehouse: centralWarehouse._id,
          id_origin_doc: order._id,
          id_sender_worker: order.id_worker,
          notes: `Ingreso generado al iniciar control de calidad de la Orden de Producción ${order.order_number || order.pre_order_number}`,
          items: documentItems
        });
        this.logger.log(`✅ WarehouseDocument INGRESO_PRODUCCION creado para orden ${order.order_number || order.pre_order_number}`);
      }
    } catch (err) {
      this.logger.error('Error al generar WarehouseDocument para orden de producción: ' + (err as Error).message);
    }
  }
}