// Alta de UNA cuenta ficticia autorizada. Ejecutar desde la raíz del proyecto.
import 'dotenv/config';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { pool, sql } from '../db.js';

const scrypt = promisify(crypto.scrypt);
const nombre = (process.env.ATLAS_NOMBRE || '').trim();
const correo = (process.env.ATLAS_CORREO || '').trim().toLowerCase();
const contrasena = process.env.ATLAS_PASSWORD || '';
const rol = (process.env.ATLAS_ROL || '').trim().toLowerCase();
try {
  if (!nombre || nombre.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
      correo.length > 254 || contrasena.length < 12 || !['gerencia','rh','colaborador'].includes(rol)) {
    throw new Error('Revisa ATLAS_NOMBRE, ATLAS_CORREO, ATLAS_PASSWORD (mínimo 12 caracteres) y ATLAS_ROL.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(contrasena, Buffer.from(salt, 'hex'), 64)).toString('hex');
  const resultado = await pool.request()
    .input('nombre', sql.NVarChar(120), nombre)
    .input('correo', sql.NVarChar(254), correo)
    .input('hash', sql.VarChar(128), hash)
    .input('salt', sql.VarChar(64), salt)
    .input('rol', sql.VarChar(20), rol)
    .query(`INSERT INTO dbo.atlas_Usuarios (nombre, correo, passwordHash, passwordSalt, rol)
            OUTPUT INSERTED.idUsuario AS id
            VALUES (@nombre, @correo, @hash, @salt, @rol)`);
  console.log('Cuenta ficticia creada. ID:', resultado.recordset[0].id, 'Rol:', rol);
} catch (error) {
  console.error('No se creó la cuenta:', error.message);
  process.exitCode = 1;
} finally {
  await pool.close();
}
