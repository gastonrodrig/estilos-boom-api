// Exportamos explícitamente para evitar colisión de nombres entre:
// - WarehouseDocument (tipo Mongoose de la colección Warehouse) de warehouse.schema.ts
// - WarehouseDocument (clase del documento operativo) de warehouse-document.schema.ts
export { Warehouse, WarehouseSchema } from './warehouse.schema';
export * from './warehouse-stock.schema';
export * from './warehouse-document.schema';
