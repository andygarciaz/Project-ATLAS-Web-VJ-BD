import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Publicar SOLO comunicados expresamente destinados a lectura general.
// No revela información de empleados ni datos sensibles.
router.get('/', async (_req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT idNoticia AS id, titulo, contenido,
             CONVERT(char(10), fecha, 23) AS fecha
      FROM dbo.atlas_NoticiasDemo
      WHERE publicada = 1
      ORDER BY fecha DESC, idNoticia DESC;
    `);
    res.set('Cache-Control', 'no-store');
    return res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener noticias:', error.message);
    return res.status(503).json({ ok: false, mensaje: 'Noticias no disponibles' });
  }
});

export default router;
