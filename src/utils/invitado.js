// ============================================================
// CUENTAS INVITADAS
// El checkout sin registro necesita un usuario al que asociar el
// pedido (Pedido.usuario_id es obligatorio). En lugar de tocar el
// esquema se crea un "usuario invitado": una fila en Usuario con
// los datos de contacto y un password_hash imposible de validar.
//
// Si la persona luego crea una cuenta con el mismo correo, el
// registro "reclama" esta fila (ver usuario.servicio.js) y sus
// pedidos quedan vinculados a la cuenta real.
// ============================================================

const HASH_INVITADO = "INVITADO_SIN_CONTRASENA";

module.exports = { HASH_INVITADO };
