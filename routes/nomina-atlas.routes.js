import { Router } from 'express';
import { pool, sql } from '../db.js';
import { requiereSesion } from '../middleware/auth.js';
const router = Router();
router.use(requiereSesion);
const getId = req => Number(req.session?.usuario?.id);
const error = (res, e) => { console.error('ATLAS API:', e.message); return res.status(500).json({ok:false,mensaje:'No se pudo consultar la información'}); };
router.get('/',async(req,res)=>{
 try {
 const q=await pool.request().input('id',sql.Int,getId(req)).query(`
 SELECT TOP (50) n.iIdRecibo AS id, n.vcPeriodo AS periodo,
 CONVERT(char(10),n.dtFechaPago,23) AS fechaPago,
 n.dSalarioBruto AS bruto,n.dTotalDeducciones AS deducciones,n.dSalarioNeto AS neto
 FROM dbo.atlas_UsuarioEmpleado v
 JOIN dbo.atlas_Usuarios a ON a.idUsuario=v.idUsuario AND a.activo=1
 JOIN dbo.kio_tbRecibosNomina n ON n.iIdCompania=v.compania AND n.iIdEmpleado=v.idEmpleado
 WHERE v.idUsuario=@id ORDER BY n.dtFechaPago DESC,n.iIdRecibo DESC`);
 res.set('Cache-Control','no-store').json({ok:true,recibos:q.recordset});
 } catch(e){return error(res,e)}
});
router.get('/:id/conceptos',async(req,res)=>{
 const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({ok:false,mensaje:'Recibo inválido'});
 try{
 const q=await pool.request().input('id',sql.Int,getId(req)).input('recibo',sql.Int,id).query(`
 SELECT TOP (1) n.iIdRecibo AS id,n.vcPeriodo AS periodo,
 CONVERT(char(10),n.dtFechaPago,23) AS fechaPago,
 n.dSalarioBruto AS bruto,n.dTotalDeducciones AS deducciones,n.dSalarioNeto AS neto
 FROM dbo.atlas_UsuarioEmpleado v JOIN dbo.atlas_Usuarios a ON a.idUsuario=v.idUsuario AND a.activo=1
 JOIN dbo.kio_tbRecibosNomina n ON n.iIdCompania=v.compania AND n.iIdEmpleado=v.idEmpleado
 WHERE v.idUsuario=@id AND n.iIdRecibo=@recibo`);
 if(!q.recordset.length)return res.status(404).json({ok:false,mensaje:'Recibo no encontrado'});
 const [p,d]=await Promise.all([
 pool.request().input('recibo',sql.Int,id).query('SELECT vcConcepto AS concepto,dMonto AS monto FROM dbo.kio_tbReciboPercepciones WHERE iIdRecibo=@recibo'),
 pool.request().input('recibo',sql.Int,id).query('SELECT vcConcepto AS concepto,dMonto AS monto FROM dbo.kio_tbReciboDeducciones WHERE iIdRecibo=@recibo')]);
 res.set('Cache-Control','no-store').json({ok:true,recibo:q.recordset[0],percepciones:p.recordset,deducciones:d.recordset});
 }catch(e){return error(res,e)}
});
export default router;
