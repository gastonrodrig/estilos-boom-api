const mongoose = require('mongoose');
require('dotenv').config();
const url = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/estilos-boom';
mongoose.connect(url)
  .then(async () => {
    const pm = await mongoose.connection.collection('paymentmanualtransactions').find({}).toArray();
    console.log('--- PAGOS MANUALES ---');
    console.log(JSON.stringify(pm, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
