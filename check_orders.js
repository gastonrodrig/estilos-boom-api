const mongoose = require('mongoose');
require('dotenv').config();
const url = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/estilos-boom';
mongoose.connect(url)
  .then(async () => {
    const orders = await mongoose.connection.collection('orders').find({}).toArray();
    console.log('--- ORDERS EN LA BASE DE DATOS ---');
    console.log(JSON.stringify(orders, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
