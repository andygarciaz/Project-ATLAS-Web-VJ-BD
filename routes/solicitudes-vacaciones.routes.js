import { Router } from 'express';
import { pool, sql } from '../db.js';
import { requiereSesion } from '../middleware/auth.js';

const router = Router();
router.use(requiereSesion);

const ALLOWED_ROLES = new Set(['gerencia','rh','colaborador']);
const isDay = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
function businessDays(start, end) {
  let count=0;
  for(let d=new Date(`${start}T00:00:00Z`);d <= new Date(`${end}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+1)){
    if(d.getUTCDay()!==0 && d.getUTCDay()!==6) count++;
  }
  return count;
}
const userId = (req) => Number(req.session?.usuario?.id);

router.get('/solicitudes', async (req,res) => {
  const id=userId(req);
  if(!Number.isSafeInteger(id) || id<=0) return res.status(401).json({ok:false,mensaje:'Sesión inválida'});
  try {
    const r=await pool.request().input('id',sql.Int,id).query(`
      SELECT s.iIdSolicitudUsuario AS idSolicitud,
        CONVERT(char(10),v.dtFechaInicio,23) AS inicio,
        CONVERT(char(10),v.dtFechaFin,23) AS fin,
        v.iDiasEfectivos AS dias, est.nombre AS estado,
        s.vcComentarios AS comentarios
      FROM dbo.atlas_UsuarioKio AS puente
      JOIN dbo.kio_tbSolicitudesUsuarios AS s ON s.iIdUsuario=puente.idUsuarioKio
      JOIN dbo.kio_tbSolVacaciones AS v ON v.iIdSolicitudUsuario=s.iIdSolicitudUsuario
      JOIN dbo.cat_estados_solicitud AS est ON est.id_estado_solicitud=s.id_estado_solicitud
      WHERE puente.idUsuarioAtlas=@id
      ORDER BY s.iIdSolicitudUsuario DESC;
    `);
    res.set('Cache-Control','no-store');
    return res.json({ok:true, solicitudes:r.recordset});
  }catch(e){console.error('GET solicitudes:',e);return res.status(500).json({ok:false,mensaje:'Error al consultar solicitudes. Comprueba la tabla puente y el esquema.'});}
});

router.post('/solicitudes', async (req,res) => {
  const id=userId(req);const rol=req.session?.usuario?.rol;
  if(!Number.isSafeInteger(id)||id<=0) return res.status(401).json({ok:false,mensaje:'Sesión inválida'});
  if(!ALLOWED_ROLES.has(rol)) return res.status(403).json({ok:false,mensaje:'Rol sin permiso'});
  const {inicio,fin,comentarios=''}=req.body??{};
  if(!isDay(inicio)||!isDay(fin)||inicio>fin||typeof comentarios!=='string'||comentarios.length>255)
    return res.status(400).json({ok:false,mensaje:'Fechas o comentario inválidos'});
  const year=Number(inicio.slice(0,4));
  if(fin.slice(0,4)!==inicio.slice(0,4)) return res.status(400).json({ok:false,mensaje:'Divide solicitudes que abarcan dos años'});
  const dias=businessDays(inicio,fin);
  if(dias<1||dias>30) return res.status(400).json({ok:false,mensaje:'Selecciona de 1 a 30 días hábiles'});
  // No inventar clave_mvto, politica de festivos o catalogos ausentes.
  const claveMvto=Number(process.env.ATLAS_VAC_CLAVE_MVTO);
  if(!process.env.ATLAS_VAC_CLAVE_MVTO || !Number.isSafeInteger(claveMvto) || claveMvto<0)
    return res.status(503).json({ok:false,mensaje:'Falta configurar clave_mvto de vacaciones con un valor validado por el equipo BD'});
  const kioColumnInfo=await pool.request().query("SELECT CASE WHEN COL_LENGTH('dbo.kio_tbUsuarios','iIdUsuario') IS NOT NULL THEN 'iIdUsuario' WHEN COL_LENGTH('dbo.kio_tbUsuarios','idUsuario') IS NOT NULL THEN 'idUsuario' ELSE NULL END AS pk");
  const kioPk=kioColumnInfo.recordset[0]?.pk;
  if(!kioPk) return res.status(503).json({ok:false,mensaje:'No se encontró el identificador de kio_tbUsuarios'});
  const tx=new sql.Transaction(pool);
  try{
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const base=await new sql.Request(tx).input('id',sql.Int,id).input('anio',sql.SmallInt,year).query(`
      SELECT TOP (1) p.compania,p.idEmpleado,ak.idUsuarioKio,
        k.vcUsuario, e.fecha_alta, s.dDiasDisponibles
      FROM dbo.atlas_UsuarioEmpleado AS p
      JOIN dbo.atlas_Usuarios AS au ON au.idUsuario=p.idUsuario AND au.activo=1
      JOIN dbo.atlas_UsuarioKio AS ak ON ak.idUsuarioAtlas=p.idUsuario
      JOIN dbo.kio_tbUsuarios AS k ON k.${kioPk}=ak.idUsuarioKio
      JOIN dbo.empleados AS e ON e.compania=p.compania AND e.id=p.idEmpleado
      JOIN dbo.kio_tbVacacionesSaldo AS s WITH(UPDLOCK,HOLDLOCK)
        ON s.iIdCompania=p.compania AND s.iIdEmpleado=p.idEmpleado AND s.iAnio=@anio
      WHERE p.idUsuario=@id AND k.bActivo=1 AND k.bBorrado=0;
    `);
    const p=base.recordset[0];
    if(!p || ['publico','administrador'].includes(String(p.vcUsuario).toLowerCase())) {
      await tx.rollback();return res.status(409).json({ok:false,mensaje:'Se requiere vinculación exclusiva de usuario heredado, empleado y saldo para este año'});
    }
    if(Number(p.dDiasDisponibles)<dias){await tx.rollback();return res.status(409).json({ok:false,mensaje:'Saldo insuficiente'});}
    const catalog=await new sql.Request(tx).query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.cat_tipos_solicitud WHERE LOWER(nombre) LIKE '%vacacion%') AS tipos,
        (SELECT COUNT(*) FROM dbo.cat_estados_solicitud WHERE LOWER(nombre) LIKE '%pendien%') AS estados;
    `);
    if(catalog.recordset[0].tipos!==1||catalog.recordset[0].estados!==1){await tx.rollback();return res.status(409).json({ok:false,mensaje:'Catálogos de Vacaciones/Pendiente faltantes o ambiguos'});}
    const overlap=await new sql.Request(tx)
      .input('legacy',sql.Int,p.idUsuarioKio).input('ini',sql.Date,inicio).input('fin',sql.Date,fin)
      .query(`SELECT COUNT(*) AS total FROM dbo.kio_tbSolicitudesUsuarios s WITH(UPDLOCK,HOLDLOCK)
        JOIN dbo.kio_tbSolVacaciones v ON v.iIdSolicitudUsuario=s.iIdSolicitudUsuario
        JOIN dbo.cat_estados_solicitud est ON est.id_estado_solicitud=s.id_estado_solicitud
        WHERE s.iIdUsuario=@legacy AND LOWER(est.nombre) NOT LIKE '%rechaz%'
          AND LOWER(est.nombre) NOT LIKE '%cancel%'
          AND v.dtFechaInicio<=@fin AND v.dtFechaFin>=@ini`);
    if(overlap.recordset[0].total){await tx.rollback();return res.status(409).json({ok:false,mensaje:'Ya hay una solicitud que coincide con esas fechas'});}
    // Validar días laborables sin feriados externos: este módulo NO aprueba solicitudes automáticamente.
    const antiguedad=Math.max(0,year-new Date(p.fecha_alta).getUTCFullYear());
    const inserted=await new sql.Request(tx)
      .input('legacy',sql.Int,p.idUsuarioKio)
      .input('coment',sql.VarChar(255),comentarios)
      .query(`INSERT INTO dbo.kio_tbSolicitudesUsuarios(iIdUsuario,id_tipo_solicitud,id_estado_solicitud,vcComentarios,dtFechaRegistro)
        OUTPUT INSERTED.iIdSolicitudUsuario AS id
        VALUES (@legacy,
          (SELECT TOP(1) id_tipo_solicitud FROM dbo.cat_tipos_solicitud WHERE LOWER(nombre) LIKE '%vacacion%'),
          (SELECT TOP(1) id_estado_solicitud FROM dbo.cat_estados_solicitud WHERE LOWER(nombre) LIKE '%pendien%'),
          @coment, GETDATE());`);
    const solicitudId=inserted.recordset[0].id;
    await new sql.Request(tx)
      .input('id',sql.Int,solicitudId)
      .input('legacy',sql.Int,p.idUsuarioKio)
      .input('ini',sql.Date,inicio).input('fin',sql.Date,fin)
      .input('dias',sql.Decimal(5,1),dias).input('antig',sql.Int,antiguedad)
      .input('mvto',sql.Int,claveMvto)
      .input('comp',sql.Int,p.compania).input('empleado',sql.Int,p.idEmpleado)
      .input('coment',sql.VarChar(255),comentarios)
      .query(`INSERT INTO dbo.kio_tbSolVacaciones
        (iIdSolicitudUsuario,iIdUsuario,dtFechaRegistro,dtFechaInicio,dtFechaFin,dtFechaRegresa,
         iDias,iDiasEfectivos,iAntiguedad,clave_mvto,IIDCOMPANIA,IIDEMPLEADO,vcComentarios)
        VALUES(@id,@legacy,GETDATE(),@ini,@fin,DATEADD(day,1,@fin),
         @dias,@dias,@antig,@mvto,@comp,@empleado,@coment);`);
    await tx.commit();
    return res.status(201).json({ok:true,idSolicitud:solicitudId,estado:'Pendiente',diasProvisionales:dias});
  }catch(e){try{await tx.rollback()}catch{};console.error('POST solicitudes vacaciones:',e);
    return res.status(500).json({ok:false,mensaje:'No se pudo registrar la solicitud. Revisa el esquema y las claves foráneas.'});}
});
export default router;
