export const APP_NAME = 'Estilos Boom API';
export const APP_DESCRIPTION = 'The Estilos Boom API description';
export const API_VERSION = 'v1';

export const API_PREFIX = 'api/v1';

export enum Roles {
  ADMIN = 'Administrador',
  CLIENT = 'Cliente',
  WORKER = 'Almacenero'
}

export enum Estado {
  ACTIVO = 'Activo',
  INACTIVO = 'Inactivo'
}

export enum DocType {
  DNI = 'DNI',
  RUC = 'RUC'
}

export const ROLE_PERMISSIONS = {
  [Roles.ADMIN]: [
    'dashboard:view',
    // Categorías
    'categories:view', 'categories:edit',

    // Productos
    'products:view',
    'products:add',    // Pantalla de creación con variantes
    'products:edit',   // Pantalla de edición con variantes

    // Inventario (Dividido según documento)
    'products_inventory:view',
    'products_inventory:update',
    'supplies_inventory:view',
    'supplies_inventory:create',
    'supplies_inventory:update',

    // Abastecimiento (Módulo Nuevo)
    'procurement:view',
    'procurement:create',
    'procurement:update', // Confirmar, rechazar y recibir




    // Mantengo los que ya tenías para órdenes y clientes
    'orders:view', 'orders:manage',
    'payments:verify',
    'quotations:view', 'quotations:manage', 'quotations:verify-payment',
    'payments:view', 'payments:manage',
    'clients:view', 'clients:manage',
    'reviews:view'
  ],

  [Roles.CLIENT]: [
    'dashboard:view',
    'orders:view',
    'payments:create',
    'quotations:view',
    'profile:view', 'profile:manage'
  ],

  [Roles.WORKER]: [ // Rol Almacenero - Reducido por seguridad
    'dashboard:view',
    'products_inventory:view',
    'supplies_inventory:view'
  ]
};