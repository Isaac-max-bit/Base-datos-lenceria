const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Clave para firmar los tokens de sesión. Debe ir en .env:
//   JWT_SECRET=una-cadena-larga-y-aleatoria
// Si no existe, se genera una temporal por proceso (las sesiones se pierden
// al reiniciar el backend). Configúrala antes de publicar.
let secreto = process.env.JWT_SECRET;

if (!secreto) {
    secreto = crypto.randomBytes(48).toString('hex');
    console.warn(
        'AVISO: JWT_SECRET no configurado. Se generó una clave temporal; las sesiones se cerrarán al reiniciar el backend.'
    );
}

const DURACION = process.env.JWT_EXPIRES_IN || '7d';

const firmarToken = (usuario) =>
    jwt.sign(
        {
            sub: String(usuario.id_usuario),
            rol: usuario.rol ?? null
        },
        secreto,
        { expiresIn: DURACION }
    );

const verificarToken = (token) => {
    try {
        return jwt.verify(token, secreto);
    } catch {
        return null;
    }
};

module.exports = { firmarToken, verificarToken };
