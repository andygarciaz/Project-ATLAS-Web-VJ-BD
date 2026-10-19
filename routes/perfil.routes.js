import { Router } from "express";
import { pool, sql } from "../db.js";
import { requiereSesion } from "../middleware/auth.js";

const router = Router();

// GET /api/perfil: el empleado se determina exclusivamente por la sesión.
router.get("/", requiereSesion, async (req, res) => {
  const idUsuario = Number(req.session?.usuario?.id);
  if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
    return res.status(401).json({ ok: false, mensaje: "Sesión no válida" });
  }

  try {
    const resultado = await pool.request()
      .input("idUsuario", sql.Int, idUsuario)
      .query(`
        SELECT TOP (1)
          a.idUsuario,
          a.nombre AS nombreCuenta,
          a.correo,
          a.rol,
          v.compania,
          v.idEmpleado,
          e.empleado AS numeroEmpleado,
          CONVERT(char(10), e.fecha_alta, 23) AS fechaIngreso,
          r.nombre AS nombreRecurso,
          r.paterno AS apellidoPaterno,
          r.materno AS apellidoMaterno
        FROM dbo.atlas_Usuarios AS a
        INNER JOIN dbo.atlas_UsuarioEmpleado AS v
          ON v.idUsuario = a.idUsuario
        INNER JOIN dbo.empleados AS e
          ON e.compania = v.compania AND e.id = v.idEmpleado
        INNER JOIN dbo.recursos AS r
          ON r.id = e.id
        WHERE a.idUsuario = @idUsuario AND a.activo = 1
      `);

    res.set("Cache-Control", "no-store");
    if (!resultado.recordset.length) {
      return res.status(404).json({ ok: false, mensaje: "Cuenta sin empleado vinculado" });
    }
    return res.json({ ok: true, perfil: resultado.recordset[0] });
  } catch (error) {
    console.error("Error GET /api/perfil:", error.message);
    return res.status(500).json({ ok: false, mensaje: "No fue posible consultar el perfil" });
  }
});

export default router;
