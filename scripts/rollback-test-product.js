const mongoose = require('mongoose');
require('dotenv').config();

async function rollback() {
  const mongoUri = process.env.DATABASE_URL;
  await mongoose.connect(mongoUri);

  console.log('Conectado a MongoDB:', mongoUri);

  const Product = mongoose.model('Product', new mongoose.Schema({ sku: String }, { collection: 'Product' }));
  const ProductVariant = mongoose.model('ProductVariant', new mongoose.Schema({ id_product: mongoose.Schema.Types.ObjectId, sku_variant: String }, { collection: 'ProductVariant' }));

  try {
    const skuBase = 'TEST-VEST-GALA';
    const product = await Product.findOne({ sku: skuBase });
    
    if (product) {
      console.log('Producto encontrado. Eliminando variantes asociadas...');
      await ProductVariant.deleteMany({ id_product: product._id });
      
      console.log('Eliminando producto base...');
      await Product.deleteOne({ _id: product._id });
      
      console.log('✅ Rollback exitoso. Producto [TEST] Vestido Gala y sus variantes han sido eliminados.');
    } else {
      console.log('⚠️ Producto de prueba no encontrado en la base de datos (No hay nada que borrar).');
    }
  } catch (error) {
    console.error('❌ Error ejecutando rollback:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

rollback();
