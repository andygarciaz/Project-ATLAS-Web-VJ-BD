import { Router } from 'express';
import { pool, sql } from '../db.js';
import { requiereSesion } from '../middleware/auth.js';
const router = Router();
router.use(requiereSesion);
const getId = req => Number(req.session?.usuario?.id);
const error = (res, e) => { console.error('ATLAS API:', e.message); return res.status(500).json({ok:false,mensaje:'No se pudo consultar la información'}); };
router.get('/imss', async(req,res)=>{
 try {
 const q=await pool.request().input('id',sql.Int,getId(req)).query(`
 SELECT TOP (1) i.vcNumeroAfiliacion AS numeroAfiliacion, i.vcModalidad AS modalidad,
 i.vcClinicaAsignada AS clinica, i.vcTipoCobertura AS cobertura,
 i.dCuotaPatronal AS cuotaPatronal, i.dCuotaObrera AS cuotaObrera,
 i.dSalarioBaseCotizacion AS salarioBase,
 e.cedula_imss AS nss, e.aplicar_imss AS aplicarImss
 FROM dbo.atlas_UsuarioEmpleado v
 JOIN dbo.atlas_Usuarios a ON a.idUsuario=v.idUsuario AND a.activo=1
 JOIN dbo.empleados e ON e.compania=v.compania AND e.id=v.idEmpleado
 LEFT JOIN dbo.kio_tbPrestacionesIMSS i ON i.iIdCompania=v.compania AND i.iIdEmpleado=v.idEmpleado
 WHERE v.idUsuario=@id`);
 res.set('Cache-Control','no-store').json({ok:true,imss:q.recordset[0]??null});
 }catch(e){return error(res,e)}
});
router.get('/ahorro', async(req,res)=>{
 try {
 const q=await pool.request().input('id',sql.Int,getId(req)).query(`
 SELECT TOP (100) f.iAnio AS anio, f.iMes AS mes,
 f.dAportacionEmpleado AS empleado, f.dAportacionEmpresa AS empresa,
 f.dAcumulado AS acumulado
 FROM dbo.atlas_UsuarioEmpleado v
 JOIN dbo.atlas_Usuarios a ON a.idUsuario=v.idUsuario AND a.activo=1
 JOIN dbo.kio_tbFondoAhorro f ON f.iIdCompania=v.compania AND f.iIdEmpleado=v.idEmpleado
 WHERE v.idUsuario=@id ORDER BY f.iAnio DESC,f.iMes DESC`);
 res.set('Cache-Control','no-store').json({ok:true,movimientos:q.recordset});
 }catch(e){return error(res,e)}
});
export default router;
