# Explicación del Módulo de Gestión de Producción

## Contexto
Este módulo se encarga de manejar todo el proceso de fabricación en el taller, desde que se planifica hacer una prenda hasta que está terminada y lista para venderse. El objetivo es que el equipo de frontend entienda de dónde salen los datos para armar las pantallas, ya que separamos los materiales de fabricación (telas, hilos) de la ropa final, y automatizamos el control de tiempos y descuentos de inventario.

## Tablas del Módulo y sus Funciones

### 1. RawMaterial (Materia Prima)
```dbml
Table RawMaterial {
  id_material ObjectId [pk]
  name varchar [not null]
  description text
  unit_measure varchar [note: 'metros, unidades, kilos']
  stock number [default: 0] // Dato dinámico para mostrar la disponibilidad actual en la interfaz
  min_stock number [default: 5] // Umbral: Si stock < min_stock, pintar alerta visual (ej. texto rojo)
  created_at timestamp
}
```
**Función:** Esta tabla sirve para guardar el inventario de la materia prima. Su objetivo es separar los insumos del taller (lo que usamos para fabricar) del catálogo de ventas (la ropa ya terminada). El frontend va a usar el campo "stock" para mostrar cuánto material queda y "min_stock" para pintar alguna alerta visual si nos estamos quedando sin insumos.

**Por qué existe:** Para evitar mezclar el inventario de lo que "compramos para fabricar" con lo que "vendemos". Un rollo de tela o un hilo no tienen talla ni color comercial, por lo que necesitaban su propia tabla independiente de los productos finales para evitar desordenar la tienda.

### 2. ProductionOrder (Orden de Producción)
```dbml
Table ProductionOrder {
  id_production_order ObjectId [pk]
  order_number varchar [unique, not null]
  id_product_variant ObjectId [ref: > ProductVariant.id_variant]
  id_worker_manager ObjectId [ref: > Worker.id_worker]
  quantity_to_produce number [not null]
  status varchar [note: 'PLANIFICADO, EN_TALLER, COMPLETADO, CANCELADO'] // Usar para deshabilitar botones de edición si ya está en taller o completado
  priority varchar [default: 'Media']
  start_date timestamp
  deadline timestamp [not null] // Usar para ordenar las tablas de mayor a menor urgencia en el dashboard
  completed_at timestamp
  created_at timestamp
  updated_at timestamp
}
```
**Función:** Es el ticket de trabajo o la orden principal. Sirve para agrupar toda la información de lo que se va a fabricar. Relaciona al trabajador encargado, cuántas prendas se van a hacer y para cuándo tienen que estar listas (deadline). El frontend usará mucho el campo "status" para habilitar o esconder botones en la interfaz dependiendo de si la orden recién empieza o ya terminó.

**Por qué existe:** Para centralizar la operación. Es el "contrato" interno que une todas las partes dispersas del sistema: asigna un empleado, estipula qué variante de ropa resultará y establece un marco de tiempo. Sin esta tabla central, no habría forma de hacer seguimiento al trabajo del taller.

### 3. ProductionRequirement (Requisitos de Insumos)
```dbml
Table ProductionRequirement {
  id_requirement ObjectId [pk]
  id_production_order ObjectId [ref: > ProductionOrder.id_production_order]
  id_material ObjectId [ref: > RawMaterial.id_material]
  quantity_required number [not null]
  was_discounted boolean [default: false] // Candado: Si es true, bloquear la opción de editar o eliminar este insumo en la interfaz
}
```
**Función:** Esta es la "receta" de la orden. Como una orden necesita varios materiales, esta tabla sirve para decirle al sistema exactamente cuánta tela o cuántos botones requiere esa orden específica. El campo "was_discounted" es un candado de seguridad interno para asegurarnos de no descontar el material dos veces si alguien le da doble clic al botón en el frontend.

**Por qué existe:** Para resolver de manera limpia una relación de "muchos a muchos". Una orden necesita múltiples insumos, y un insumo se usa en múltiples órdenes. Esta tabla es el puente necesario para conectar la orden con sus materiales sin duplicar información.

### 4. RawMaterialMovement (Kardex del Taller)
```dbml
Table RawMaterialMovement {
  id_rm_movement ObjectId [pk]
  id_material ObjectId [ref: > RawMaterial.id_material]
  id_production_order ObjectId [ref: > ProductionOrder.id_production_order]
  type varchar [note: 'ENTRADA, CONSUMO, AJUSTE'] // Filtro principal para los selectores en la vista de historial
  quantity number
  previous_stock number
  new_stock number
  created_at timestamp
}
```
**Función:** Es el historial del taller. Su función es registrar cada vez que el stock de un material cambia. Esto sirve por si en algún momento falta material, el administrador pueda entrar a esta vista en el frontend y ver exactamente en qué orden de producción se gastó esa tela.

**Por qué existe:** Por la regla de oro de los sistemas de inventario: nunca se actualiza un stock sin dejar un rastro histórico. Existe puramente para temas de auditoría, para detectar descuadres y evitar mermas o robos sin justificación en el almacén del taller.

### 5. ProductionAlert (Notificaciones)
```dbml
Table ProductionAlert {
  id_alert ObjectId [pk]
  id_production_order ObjectId [ref: > ProductionOrder.id_production_order]
  alert_type varchar [note: 'PROXIMIDAD, ATRASO, STOCK_INSUMOS']
  message text
  is_read boolean [default: false] // Si es false, sumar +1 al contador rojo de la campanita de notificaciones
  created_at timestamp
}
```
**Función:** Es el buzón de notificaciones. En lugar de que el usuario tenga que revisar orden por orden para ver cuál está atrasada, el sistema crea avisos y los guarda aquí. Su función para el frontend es alimentar la sección de notificaciones en la barra superior. El campo "is_read" sirve para que el aviso desaparezca cuando el usuario ya lo vio.

**Por qué existe:** Para transformar el sistema de uno reactivo a uno proactivo. En lugar de obligar al frontend a descargar todas las fechas para calcular cuáles están por vencer, el backend hace el trabajo pesado en segundo plano y simplemente deposita el aviso listo para ser consumido.

## Lógica del Negocio Implementada

1.  **Órdenes con fecha límite:** La tabla `ProductionOrder` tiene el campo `deadline`. Esto obliga a especificar una fecha máxima de entrega, permitiendo al frontend ordenar el trabajo por prioridad.
2.  **Alertas automáticas:** El backend ejecuta un proceso periódico que revisa el `deadline`. Si faltan menos de 48 horas, genera un registro en `ProductionAlert` automáticamente.
3.  **Descuento de insumos:** Al iniciar la orden (`EN_TALLER`), el backend consulta la "receta" y resta el material de `RawMaterial` de forma transaccional (segura).
4.  **Entrada al inventario:** Al marcar como `COMPLETADA`, la cantidad fabricada se suma directamente al stock comercial del producto, evitando el ingreso manual doble.