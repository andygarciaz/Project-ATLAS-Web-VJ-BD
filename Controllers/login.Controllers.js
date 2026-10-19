import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { pool, sql } from '../db.js';
import { enviarCodigo } from '../mail.js';

const scrypt = promisify(crypto.scrypt);
const enmascarar = (correo) => {
  const [usuario, dominio] = correo.split('@');
  return `${usuario[0]}***@${dominio}`;
};
const validarPassword = async (contrasena, hash, salt) => {
  if (!/^[a-f0-9]{128}$/i.test(hash) || !/^[a-f0-9]{32}$/i.test(salt)) return false;
  const calculado = await scrypt(contrasena, Buffer.from(salt, 'hex'), 64);
  return crypto.timingSafeEqual(calculado, Buffer.from(hash, 'hex'));
};

export const login = async (req, res) => {
  const { correo, contrasena } = req.body ?? {};
  if (typeof correo !== 'string' || typeof contrasena !== 'string' ||
      !correo.trim() || !contrasena || correo.length > 254) {
    return res.status(400).json({ ok: false, mensaje: 'Datos incompletos' });
  }
  try {
    const r = await pool.request()
      .input('correo', sql.NVarChar(254), correo.trim().toLowerCase())
      .query(`SELECT idUsuario, nombre, correo, passwordHash, passwordSalt, rol
              FROM dbo.atlas_Usuarios WHERE correo = @correo AND activo = 1`);
    const u = r.recordset[0];
    if (!u || !(await validarPassword(contrasena, u.passwordHash, u.passwordSalt))) {
      return res.status(401).json({ ok: false, mensaje: 'Correo o contraseña incorrectos.' });
    }
    const codigo = crypto.randomInt(100000, 1000000).toString();
    req.session.pendiente = {
      id: u.idUsuario, nombre: u.nombre, correo: u.correo, rol: u.rol,
      codigo, intentos: 0, expira: Date.now() + 5 * 60 * 1000
    };
    try {
      await enviarCodigo(u.correo, codigo);
    } catch (error) {
      delete req.session.pendiente;
      console.error('Error al enviar código:', error);
      return res.status(503).json({ ok: false, mensaje: 'No se pudo enviar el código de verificación.' });
    }
    return res.json({ ok: true, correo: enmascarar(u.correo) });
  } catch (err) {
    console.error('Error de login:', err);
    return res.status(500).json({ ok: false, mensaje: 'Error del servidor' });
  }
};

export const verificar = (req, res) => {
  const p = req.session.pendiente;
  if (!p) return res.status(401).json({ ok: false, mensaje: 'Inicia sesión de nuevo' });
  if (Date.now() > p.expira || p.intentos >= 3) {
    delete req.session.pendiente;
    return res.status(401).json({ ok: false, mensaje: 'Código expirado, inicia sesión de nuevo' });
  }
  if (typeof req.body?.codigo !== 'string' || req.body.codigo !== p.codigo) {
    p.intentos++;
    return res.status(401).json({ ok: false, mensaje: 'Código incorrecto' });
  }
  const usuario = { id: p.id, nombre: p.nombre, correo: p.correo, rol: p.rol };
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ ok: false, mensaje: 'Error al crear sesión' });
    req.session.usuario = usuario;
    req.session.save((saveErr) => {
      if (saveErr) return res.status(500).json({ ok: false, mensaje: 'Error al guardar sesión' });
      res.json({ ok: true, redirect: '/paginas/Dashboard.html' });
    });
  });
};

export const sesion = (req, res) => res.json({ ok: true, usuario: req.session.usuario });
export const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
};
