import { Router } from 'express';
import { pool, sql } from '../db.js';

const router = Router();

// Requiere sesion a nivel de app.js:
// app.use('/api/noticias', requiereSesion, noticiasRoutes);
router.get('/', async (_req, res) => {
  try {
    const resultado = await pool.request().query(`
      SELECT idNoticia AS id, titulo, contenido,
             CONVERT(char(10), fecha, 23) AS fecha
      FROM dbo.atlas_NoticiasDemo
      WHERE publicada = 1
      ORDER BY fecha DESC, idNoticia DESC;
    `);
    res.set('Cache-Control', 'no-store');
    return res.json(resultado.recordset);
  } catch (error) {
    console.error('Error al consultar noticias:', error);
    return res.status(503).json({ ok: false, mensaje: 'No se pudieron consultar las noticias.' });
  }
});

// Solo Gerencia y Recursos Humanos publican en SQL Server.
router.post('/', async (req, res) => {
  const usuario = req.session?.usuario;
  if (!usuario) {
    return res.status(401).json({ ok: false, mensaje: 'Debes iniciar sesion.' });
  }
  if (!['rh', 'gerencia'].includes(usuario.rol)) {
    return res.status(403).json({ ok: false, mensaje: 'Tu rol no permite publicar noticias.' });
  }

  const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
  const contenido = typeof req.body?.contenido === 'string' ? req.body.contenido.trim() : '';
  if (!titulo || !contenido || titulo.length > 150 || contenido.length > 2000) {
    return res.status(400).json({ ok: false, mensaje: 'Titulo (1-150) y contenido (1-2000) son obligatorios.' });
  }

  try {
    const resultado = await pool.request()
      .input('titulo', sql.NVarChar(150), titulo)
      .input('contenido', sql.NVarChar(2000), contenido)
      .query(`
        INSERT INTO dbo.atlas_NoticiasDemo (titulo, contenido, fecha, publicada)
        OUTPUT INSERTED.idNoticia AS id
        VALUES (@titulo, @contenido, CONVERT(date, GETDATE()), 1);
      `);
    return res.status(201).json({ ok: true, id: resultado.recordset[0].id });
  } catch (error) {
    console.error('Error al publicar noticia:', error);
    return res.status(503).json({ ok: false, mensaje: 'No se pudo guardar la noticia.' });
  }
});

export default router;
