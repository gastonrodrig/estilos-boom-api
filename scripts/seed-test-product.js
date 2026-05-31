const mongoose = require('mongoose');
require('dotenv').config();

async function seed() {
  // Conecta usando la URL de tu .env (DATABASE_URL)
  const mongoUri = process.env.DATABASE_URL;
  await mongoose.connect(mongoUri);

  console.log('Conectado a MongoDB:', mongoUri);

  // Definición mínima de Schemas
  const Category = mongoose.model('Category', new mongoose.Schema({ name: String, status: Boolean }, { collection: 'Category' }));
  const Product = mongoose.model('Product', new mongoose.Schema({ name: String, sku: String, base_price: Number, is_active: Boolean, is_new_in: Boolean, is_best_seller: Boolean, images: [String], gender: String, id_category: mongoose.Schema.Types.ObjectId, origin_type: String }, { collection: 'Product' }));
  const ProductVariant = mongoose.model('ProductVariant', new mongoose.Schema({ id_product: mongoose.Schema.Types.ObjectId, sku_variant: String, size: String, color: Object, stock: Number, physical_stock: Number, reserved_stock: Number, min_stock_alert: Number }, { collection: 'ProductVariant' }));

  try {
    // 1. Validar/Crear Categoría "Dresses"
    let category = await Category.findOne({ name: 'Dresses' });
    if (!category) {
      console.log('Categoría "Dresses" no encontrada. Creando...');
      category = await Category.create({ name: 'Dresses', status: true });
    }

    // 2. Crear Producto
    const skuBase = 'TEST-VEST-GALA';
    let product = await Product.findOne({ sku: skuBase });
    if (product) {
      console.log('El producto de prueba ya existe. Ejecuta rollback.js primero.');
      process.exit(1);
    }

    console.log('Creando producto de prueba...');
    product = await Product.create({
      name: '[TEST] Vestido Gala',
      sku: skuBase,
      base_price: 150.00,
      is_active: true,
      is_new_in: true,           // <--- ESTO ES LO QUE HACE QUE APAREZCA EN /catalogue/new-in
      is_best_seller: false,
      images: ['https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png'], // Placeholder seguro
      gender: 'MUJER',
      origin_type: 'RETAIL',
      id_category: category._id
    });

    // 3. Crear Variante (Necesaria para que tenga stock, talla y color)
    console.log('Creando variante de prueba...');
    await ProductVariant.create({
      id_product: product._id,
      sku_variant: `${skuBase}-S-BLK`,
      size: 'S',
      color: { name: 'Negro', hex: '#000000' },
      stock: 50,              // <--- ESTO DEFINE EL STOCK QUE EL FRONTEND VE
      physical_stock: 50,
      reserved_stock: 0,
      min_stock_alert: 10
    });

    console.log('✅ Seed exitoso. Producto [TEST] Vestido Gala creado e inyectado en /catalogue/new-in y /catalogue/dresses');
  } catch (error) {
    console.error('❌ Error ejecutando seed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
