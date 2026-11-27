'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const app = require('./app');
const db = require('./models');

const PORT = Number(process.env.PORT) || 3001;

async function startServer() {
  try {
    await db.sequelize.authenticate();
    console.log(`[Higea BE] Conexión MySQL establecida (${process.env.DB_NAME || 'higea'}).`);

    app.listen(PORT, () => {
      console.log(`[Higea BE] Servidor Express escuchando en http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[Higea BE] Error al conectar con MySQL:', err.message);
    process.exit(1);
  }
}

startServer();
