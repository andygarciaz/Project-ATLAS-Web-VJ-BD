// Autorizacion exclusivamente del lado servidor: nunca confiar en el rol enviado por el cliente.
export function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    const usuario = req.session?.usuario;
    if (!usuario) return res.status(401).json({ok:false,mensaje:'Sesión no válida'});
    if (!rolesPermitidos.includes(usuario.rol)) return res.status(403).json({ok:false,mensaje:'Acceso no autorizado'});
    next();
  };
}
