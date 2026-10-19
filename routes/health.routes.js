
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/health/db
router.get('/db', async (req, res) => {
  try {
    // Consulta sencilla para comprobar la conexión
    await pool.request().query('SELECT 1 AS conexion');

    res.status(200).json({
      status: 'ok',
      message: 'Conexión con SQL Server exitosa'
    });

  } catch (error) {
    console.error('Error de conexión a SQL Server:', error.message);

    res.status(503).json({
      status: 'error',
      message: 'Base de datos no disponible'
    });
  }
});

export default router;
