import { Router } from 'express';
import { pool, sql } from '../db.js';
import { requiereSesion } from '../middleware/auth.js';

const router = Router();

// GET /api/vacaciones/saldo?anio=2026
router.get('/saldo', requiereSesion, async (req, res) => {
  const idUsuario = Number(req.session?.usuario?.id);
  const anio = Number(req.query.anio ?? new Date().getFullYear());

  if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
    return res.status(401).json({ ok: false, mensaje: 'Sesión inválida' });
  }
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return res.status(400).json({ ok: false, mensaje: 'Año inválido' });
  }

  try {
    const resultado = await pool.request()
      .input('idUsuario', sql.Int, idUsuario)
      .input('anio', sql.SmallInt, anio)
      .query(`
        SELECT TOP (1)
          s.iIdSaldo AS idSaldo,
          s.iAnio AS anio,
          s.dDiasAsignados AS asignados,
          s.dDiasDisfrutados AS disfrutados,
          s.dDiasDisponibles AS disponibles
        FROM dbo.atlas_UsuarioEmpleado AS v
        INNER JOIN dbo.atlas_Usuarios AS u
          ON u.idUsuario = v.idUsuario AND u.activo = 1
        INNER JOIN dbo.kio_tbVacacionesSaldo AS s
          ON s.iIdCompania = v.compania AND s.iIdEmpleado = v.idEmpleado
        WHERE v.idUsuario = @idUsuario AND s.iAnio = @anio
        ORDER BY s.iIdSaldo DESC;
      `);

    res.set('Cache-Control', 'no-store');
    return res.json({ ok: true, saldo: resultado.recordset[0] ?? null });
  } catch (error) {
    console.error('GET /api/vacaciones/saldo:', error);
    return res.status(500).json({ ok: false, mensaje: 'No se pudo consultar el saldo de vacaciones' });
  }
});

export default router;
