import { Router } from 'express';
import { pool, sql } from '../db.js';
import { requiereSesion } from '../middleware/auth.js';

const router = Router();

// GET /api/asistencia?anio=2026&mes=10
router.get('/', requiereSesion, async (req, res) => {
  const idUsuario = Number(req.session?.usuario?.id);
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);

  if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
    return res.status(401).json({ ok: false, mensaje: 'Sesión inválida' });
  }
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100 ||
      !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return res.status(400).json({ ok: false, mensaje: 'Indica anio (YYYY) y mes (1-12) válidos' });
  }

  try {
    const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const fin = mes === 12
      ? `${anio + 1}-01-01`
      : `${anio}-${String(mes + 1).padStart(2, '0')}-01`;

    const resultado = await pool.request()
      .input('idUsuario', sql.Int, idUsuario)
      .input('inicio', sql.VarChar(10), inicio)
      .input('fin', sql.VarChar(10), fin)
      .query(`
        SELECT
          a.iIdAsistencia AS idAsistencia,
          CONVERT(char(10), a.dtFecha, 23) AS fecha,
          a.id_tipo_asistencia AS idTipoAsistencia,
          t.nombre AS tipo,
          t.bCuentaAsistencia AS cuentaAsistencia,
          t.bEsRetardo AS esRetardo,
          t.bEsDescanso AS esDescanso,
          t.bEsAusencia AS esAusencia,
          CONVERT(char(5), a.dtEntrada, 108) AS entrada,
          CONVERT(char(5), a.dtSalida, 108) AS salida,
          a.dHorasExtras AS horasExtras,
          a.vcDetalle AS detalle
        FROM dbo.atlas_UsuarioEmpleado AS v
        INNER JOIN dbo.atlas_Usuarios AS u
          ON u.idUsuario = v.idUsuario AND u.activo = 1
        INNER JOIN dbo.kio_tbAsistencia AS a
          ON a.iIdCompania = v.compania AND a.iIdEmpleado = v.idEmpleado
        INNER JOIN dbo.cat_tipos_asistencia AS t
          ON t.id_tipo_asistencia = a.id_tipo_asistencia
        WHERE v.idUsuario = @idUsuario
          AND a.dtFecha >= CONVERT(date, @inicio, 23)
          AND a.dtFecha < CONVERT(date, @fin, 23)
        ORDER BY a.dtFecha, a.iIdAsistencia;
      `);

    res.set('Cache-Control', 'no-store');
    return res.json({ ok: true, anio, mes, registros: resultado.recordset });
  } catch (error) {
    console.error('GET /api/asistencia:', error);
    return res.status(500).json({ ok: false, mensaje: 'No se pudo consultar la asistencia' });
  }
});

export default router;
