import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Controllers
import { RawMaterialController } from './controllers/raw-material.controller';
import { ProductionOrderController } from './controllers/production-order.controller';
import { ProductionAlertController } from './controllers/production-alert.controller';

// Services
import { ProductionService } from './services/production.service';

// Schemas
import { RawMaterial, RawMaterialSchema } from './schemas/raw-material.schema';
import { ProductionOrder, ProductionOrderSchema } from './schemas/production-order.schema';
import { ProductionRequirement, ProductionRequirementSchema } from './schemas/production-requirement.schema';
import { RawMaterialMovement, RawMaterialMovementSchema } from './schemas/raw-material-movement.schema';
import { ProductionAlert, ProductionAlertSchema } from './schemas/production-alert.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: RawMaterial.name, schema: RawMaterialSchema },
            { name: ProductionOrder.name, schema: ProductionOrderSchema },
            { name: ProductionRequirement.name, schema: ProductionRequirementSchema },
            { name: RawMaterialMovement.name, schema: RawMaterialMovementSchema },
            { name: ProductionAlert.name, schema: ProductionAlertSchema },
        ]),
    ],
    controllers: [
        RawMaterialController,
        ProductionOrderController,
        ProductionAlertController,
    ],
    providers: [ProductionService],
    exports: [ProductionService],
})
export class ProductionModule { }
