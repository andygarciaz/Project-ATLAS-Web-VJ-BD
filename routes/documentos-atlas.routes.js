import { Router } from 'express';
import { pool, sql } from '../db.js';
import { requiereSesion } from '../middleware/auth.js';
const router = Router();
router.use(requiereSesion);
const getId = req => Number(req.session?.usuario?.id);
const error = (res, e) => { console.error('ATLAS API:', e.message); return res.status(500).json({ok:false,mensaje:'No se pudo consultar la información'}); };
router.get('/', async(req,res)=>{
 try{
 const q=await pool.request().input('id',sql.Int,getId(req)).query(`
 SELECT TOP (100) d.iIdDocumento AS id,d.vcDescripcion AS descripcion,
 d.vcArchivo AS archivoReferencia, d.iIdTipoDocumento AS tipoId,
 t.nombre AS tipo,CONVERT(char(10),d.dtFechaRegistro,23) AS fecha
 FROM dbo.atlas_UsuarioKio puente
 JOIN dbo.atlas_Usuarios a ON a.idUsuario=puente.idUsuarioAtlas AND a.activo=1
 JOIN dbo.kio_tbDocumentos d ON d.iIdUsuario=puente.idUsuarioKio
 LEFT JOIN dbo.cat_tipos_documento t ON t.id_tipo_documento=d.iIdTipoDocumento
 WHERE puente.idUsuarioAtlas=@id ORDER BY d.dtFechaRegistro DESC,d.iIdDocumento DESC`);
 // No enviamos ruta del archivo al navegador sin un almacenamiento/ACL verificado.
 res.set('Cache-Control','no-store').json({ok:true,documentos:q.recordset.map(({archivoReferencia,...d})=>d)});
 }catch(e){return error(res,e)}
});
export default router;
