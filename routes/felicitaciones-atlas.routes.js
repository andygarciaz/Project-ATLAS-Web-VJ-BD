import { Router } from 'express';
import { pool, sql } from '../db.js';
import { requiereSesion } from '../middleware/auth.js';

const router = Router();
router.use(requiereSesion);

router.get('/', async (req, res) => {
  try {
    const rows = await pool.request().query(`
      SELECT TOP (100) f.idFelicitacion AS id,
             a.nombre AS de, f.paraNombre AS para,
             f.mensaje, CONVERT(varchar(19),f.creadoEn,120) AS fecha
      FROM dbo.atlas_Felicitaciones AS f
      INNER JOIN dbo.atlas_Usuarios AS a ON a.idUsuario=f.idUsuarioEmisor
      ORDER BY f.creadoEn DESC, f.idFelicitacion DESC;
    `);
    res.set('Cache-Control','no-store');
    res.json({ok:true,felicitaciones:rows.recordset});
  } catch (e) {
    console.error('Consulta felicitaciones:',e);
    res.status(503).json({ok:false,mensaje:'No fue posible consultar las felicitaciones.'});
  }
});

router.post('/', async (req,res) => {
  const id = Number(req.session.usuario.id);
  const para = typeof req.body?.para==='string' ? req.body.para.trim() : '';
  const mensaje = typeof req.body?.mensaje==='string' ? req.body.mensaje.trim() : '';
  if (!Number.isSafeInteger(id) || id<1) return res.status(401).json({ok:false,mensaje:'Sesión inválida'});
  if (para.length<2 || para.length>120 || mensaje.length<1 || mensaje.length>500) {
    return res.status(400).json({ok:false,mensaje:'Destinatario (2-120) y mensaje (1-500) requeridos.'});
  }
  try {
    const q=await pool.request()
      .input('id',sql.Int,id)
      .input('para',sql.NVarChar(120),para)
      .input('mensaje',sql.NVarChar(500),mensaje)
      .query(`INSERT INTO dbo.atlas_Felicitaciones(idUsuarioEmisor,paraNombre,mensaje)
        OUTPUT INSERTED.idFelicitacion AS id
        SELECT @id,@para,@mensaje FROM dbo.atlas_Usuarios WHERE idUsuario=@id AND activo=1;`);
    if (!q.recordset.length) return res.status(403).json({ok:false,mensaje:'Cuenta no autorizada.'});
    res.status(201).json({ok:true,id:q.recordset[0].id});
  }catch(e){console.error('Guardar felicitación:',e);
    res.status(503).json({ok:false,mensaje:'No fue posible registrar la felicitación.'});}
});
export default router;
