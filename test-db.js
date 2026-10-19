
import { pool, sql } from './db.js';

async function probarConexion() {
  try {
    console.log("Iniciando prueba de conexión...");

    // 1. Comprobar la base de datos activa
    const resultadoBD = await pool.request().query(`
      SELECT DB_NAME() AS BaseDeDatos
    `);

    console.log(
      "Base de datos conectada:",
      resultadoBD.recordset[0].BaseDeDatos
    );

    // 2. Consultar cuántas tablas son visibles
    const resultadoTablas = await pool.request().query(`
      SELECT COUNT(*) AS TotalTablas
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);

    console.log(
      "Tablas disponibles:",
      resultadoTablas.recordset[0].TotalTablas
    );

    console.log("Prueba de conexión exitosa.");

  } catch (error) {
    console.error("Error al consultar SQL Server:");
    console.error(error.message);

  } finally {
    // Cerrar conexiones para finalizar la prueba
    await pool.close();
  }
}

probarConexion();
