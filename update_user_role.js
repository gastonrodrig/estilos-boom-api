const mongoose = require('mongoose');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin if not initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const email = process.argv[2];
const role = process.argv[3];

if (!email || !role) {
  console.log('Uso: node update_user_role.js <email> <role>');
  console.log('Roles disponibles: "Almacenero Boom", "Almacenero Tienda", "Administrador", "Cliente"');
  process.exit(1);
}

const url = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/estilos-boom';

mongoose.connect(url)
  .then(async () => {
    const userCol = mongoose.connection.collection('User');
    const user = await userCol.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
      console.error(`Error: Usuario con email ${email} no encontrado en la base de datos.`);
      process.exit(1);
    }
    
    // Update role in MongoDB
    await userCol.updateOne(
      { _id: user._id },
      { $set: { role: role } }
    );
    console.log(`✅ MongoDB: Rol de ${email} actualizado a "${role}" con éxito.`);
    
    // Update role in Firebase custom claims
    if (user.auth_id && !user.auth_id.startsWith('manual-')) {
      try {
        await admin.auth().setCustomUserClaims(user.auth_id, { role: role });
        console.log(`✅ Firebase: Claims actualizados para uid ${user.auth_id} con rol "${role}".`);
      } catch (fbError) {
        console.warn(`⚠️ Firebase: No se pudieron actualizar los claims en Firebase (¿el UID no existe en esta instancia de Firebase Auth?). Detalles:`, fbError.message);
      }
    } else {
      console.log(`ℹ️ Info: El usuario no tiene un auth_id de Firebase vinculado o es un usuario creado manualmente.`);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
