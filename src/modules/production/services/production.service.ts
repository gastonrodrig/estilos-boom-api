import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RawMaterial, RawMaterialDocument } from '../schemas/raw-material.schema';
import { ProductionOrder, ProductionOrderDocument } from '../schemas/production-order.schema';
import { ProductionRequirement, ProductionRequirementDocument } from '../schemas/production-requirement.schema';
import { RawMaterialMovement, RawMaterialMovementDocument } from '../schemas/raw-material-movement.schema';
import { ProductionAlert, ProductionAlertDocument } from '../schemas/production-alert.schema';

import {
    CreateRawMaterialDto,
    UpdateRawMaterialDto,
    CreateProductionOrderDto,
    UpdateProductionOrderDto
} from '../dto';
import { ProductionStatus, MovementType, AlertType } from '../enums/production.enums';

@Injectable()
export class ProductionService {
    private readonly logger = new Logger(ProductionService.name);

    constructor(
        @InjectModel(RawMaterial.name) private rawMaterialModel: Model<RawMaterialDocument>,
        @InjectModel(ProductionOrder.name) private productionOrderModel: Model<ProductionOrderDocument>,
        @InjectModel(ProductionRequirement.name) private requirementModel: Model<ProductionRequirementDocument>,
        @InjectModel(RawMaterialMovement.name) private movementModel: Model<RawMaterialMovementDocument>,
        @InjectModel(ProductionAlert.name) private alertModel: Model<ProductionAlertDocument>,
        @InjectConnection() private readonly connection: Connection,
    ) { }

    // --- Raw Materials ---
    async createRawMaterial(dto: CreateRawMaterialDto): Promise<RawMaterial> {
        return new this.rawMaterialModel(dto).save();
    }

    async findAllRawMaterials(): Promise<RawMaterial[]> {
        return this.rawMaterialModel.find().exec();
    }

    async findOneRawMaterial(id: string): Promise<RawMaterial> {
        const material = await this.rawMaterialModel.findById(id).exec();
        if (!material) throw new NotFoundException(`Raw Material with ID ${id} not found`);
        return material;
    }

    async updateRawMaterial(id: string, dto: UpdateRawMaterialDto): Promise<RawMaterial> {
        const material = await this.rawMaterialModel.findByIdAndUpdate(id, dto, { new: true }).exec();
        if (!material) throw new NotFoundException(`Raw Material with ID ${id} not found`);
        return material;
    }

    // --- Production Orders ---
    async createProductionOrder(dto: CreateProductionOrderDto): Promise<ProductionOrder> {
        return new this.productionOrderModel(dto).save();
    }

    async findAllProductionOrders(): Promise<ProductionOrder[]> {
        return this.productionOrderModel
            .find()
            .populate('id_product_variant')
            .populate('id_worker_manager')
            .exec();
    }

    async findOneProductionOrder(id: string): Promise<ProductionOrder> {
        const order = await this.productionOrderModel
            .findById(id)
            .populate('id_product_variant')
            .populate('id_worker_manager')
            .exec();
        if (!order) throw new NotFoundException(`Production Order with ID ${id} not found`);
        return order;
    }

    async updateProductionOrder(id: string, dto: UpdateProductionOrderDto): Promise<ProductionOrder> {
        const order = await this.productionOrderModel.findByIdAndUpdate(id, dto, { new: true }).exec();
        if (!order) throw new NotFoundException(`Production Order with ID ${id} not found`);
        return order;
    }

    /**
     * REGLA DE NEGOCIO: Cambiar status a EN_TALLER
     */
    async startProduction(orderId: string): Promise<ProductionOrder> {
        const session = await this.connection.startSession();
        session.startTransaction();

        try {
            const order = await this.productionOrderModel.findById(orderId).session(session);
            if (!order) throw new NotFoundException('Orden de producción no encontrada');
            if (order.status !== ProductionStatus.PLANIFICADO) {
                throw new BadRequestException('La orden debe estar en estado PLANIFICADO para iniciar');
            }

            const requirements = await this.requirementModel.find({ id_production_order: order._id }).session(session);

            for (const req of requirements) {
                if (req.was_discounted) continue;

                const material = await this.rawMaterialModel.findById(req.id_material).session(session);
                if (!material) throw new NotFoundException(`Material ${req.id_material} no encontrado`);

                if (material.stock < req.quantity_required) {
                    throw new BadRequestException(`Stock insuficiente para el material: ${material.name}`);
                }

                const previousStock = material.stock;
                material.stock -= req.quantity_required;
                await material.save({ session });

                await new this.movementModel({
                    id_material: material._id,
                    id_production_order: order._id,
                    type: MovementType.CONSUMO,
                    quantity: req.quantity_required,
                    previous_stock: previousStock,
                    new_stock: material.stock,
                }).save({ session });

                req.was_discounted = true;
                await req.save({ session });
            }

            order.status = ProductionStatus.EN_TALLER;
            order.start_date = new Date();
            await order.save({ session });

            await session.commitTransaction();
            return order;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async completeProduction(orderId: string): Promise<ProductionOrder> {
        const order = await this.productionOrderModel.findById(orderId);
        if (!order) throw new NotFoundException('Orden de producción no encontrada');

        order.status = ProductionStatus.COMPLETADO;
        order.completed_at = new Date();

        return order.save();
    }

    @Cron(CronExpression.EVERY_HOUR)
    async handleDeadlineAlerts() {
        this.logger.log('Revisando deadlines para alertas de proximidad...');

        const now = new Date();
        const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        const pendingOrders = await this.productionOrderModel.find({
            status: { $in: [ProductionStatus.PLANIFICADO, ProductionStatus.EN_TALLER] },
            deadline: { $lte: fortyEightHoursFromNow, $gt: now },
        });

        for (const order of pendingOrders) {
            const existingAlert = await this.alertModel.findOne({
                id_production_order: order._id,
                alert_type: AlertType.PROXIMIDAD,
            });

            if (!existingAlert) {
                await new this.alertModel({
                    id_production_order: order._id,
                    alert_type: AlertType.PROXIMIDAD,
                    message: `La orden ${order.order_number} está a menos de 48h de su fecha límite.`,
                }).save();

                this.logger.warn(`Alerta de proximidad creada para la orden: ${order.order_number}`);
            }
        }
    }

    // --- Requirements ---
    async addRequirement(dto: any): Promise<ProductionRequirement> {
        return new this.requirementModel(dto).save();
    }

    async getRequirementsByOrder(orderId: string): Promise<ProductionRequirement[]> {
        return this.requirementModel.find({ id_production_order: new Types.ObjectId(orderId) }).populate('id_material').exec();
    }

    // --- Movements ---
    async recordMovement(dto: any): Promise<RawMaterialMovement> {
        return new this.movementModel(dto).save();
    }

    async getMovementsByMaterial(materialId: string): Promise<RawMaterialMovement[]> {
        return this.movementModel.find({ id_material: new Types.ObjectId(materialId) }).sort({ created_at: -1 }).exec();
    }

    // --- Alerts ---
    async findAllAlerts(): Promise<ProductionAlert[]> {
        return this.alertModel.find({ is_read: false }).populate('id_production_order').exec();
    }

    async markAlertAsRead(id: string): Promise<ProductionAlert> {
        return this.alertModel.findByIdAndUpdate(id, { is_read: true }, { new: true }).exec();
    }
}
