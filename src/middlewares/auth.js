const { obtenerSupabaseAdmin } = require('../../config/supabaseAdmin');
const { verificarToken } = require('../utils/token');

// Datos públicos del usuario + nombre de su rol.
const CAMPOS_USUARIO =
    'id_usuario, nombre, email, telefono, direccion, fecha_registro, id_rol, Rol ( nombre )';

const normalizarUsuario = (fila) => {
    if (!fila) return null;

    const { Rol, ...usuario } = fila;
    return { ...usuario, rol: Rol?.nombre ?? null };
};

/**
 * Exige un token Bearer válido y carga el usuario actual desde la base.
 * Deja el usuario en req.usuario.
 */
const autenticar = async (req, res, next) => {
    try {
        const encabezado = req.get('authorization') || '';
        const [tipo, token] = encabezado.split(' ');

        if (tipo !== 'Bearer' || !token) {
            return res.status(401).json({ error: 'Debes iniciar sesión' });
        }

        const datos = verificarToken(token);

        if (!datos?.sub) {
            return res.status(401).json({
                error: 'La sesión expiró. Inicia sesión de nuevo.'
            });
        }

        const admin = obtenerSupabaseAdmin();

        if (!admin) {
            return res.status(500).json({
                error:
                    'Falta SUPABASE_SERVICE_ROLE_KEY en el backend. No se puede validar la sesión.'
            });
        }

        const { data, error } = await admin
            .from('Usuario')
            .select(CAMPOS_USUARIO)
            .eq('id_usuario', Number(datos.sub))
            .maybeSingle();

        if (error) {
            console.error('Error al validar la sesión:', error.message);
            return res.status(500).json({ error: 'No se pudo validar la sesión' });
        }

        if (!data) {
            return res.status(401).json({ error: 'La cuenta ya no existe' });
        }

        req.usuario = normalizarUsuario(data);
        return next();
    } catch (error) {
        console.error('Error inesperado al autenticar:', error.message);
        return res.status(500).json({ error: 'No se pudo validar la sesión' });
    }
};

/**
 * Exige que el usuario autenticado tenga uno de los roles indicados.
 * Se usa después de autenticar.
 */
const requiereRol = (...roles) => (req, res, next) => {
    if (!req.usuario) {
        return res.status(401).json({ error: 'Debes iniciar sesión' });
    }

    if (!roles.includes(req.usuario.rol)) {
        return res.status(403).json({
            error: 'No tienes permisos para realizar esta acción'
        });
    }

    return next();
};

/**
 * Permite al propio usuario o a un administrador.
 * Se usa en rutas con :id.
 */
const esMismoUsuarioOAdmin = (req, res, next) => {
    if (!req.usuario) {
        return res.status(401).json({ error: 'Debes iniciar sesión' });
    }

    const id = Number(req.params.id);

    if (req.usuario.id_usuario === id || req.usuario.rol === 'admin') {
        return next();
    }

    return res.status(403).json({
        error: 'Solo puedes acceder a tu propia cuenta'
    });
};

module.exports = { autenticar, requiereRol, esMismoUsuarioOAdmin };
