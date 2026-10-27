
const supabase = require('../../config/supabaseClient');

const CAMPOS_PUBLICOS =
    'id_usuario, nombre, email, telefono, direccion, fecha_registro, id_rol';

const obtenerTodos = async () => {
    const { data, error } = await supabase
        .from('Usuario')
        .select(CAMPOS_PUBLICOS)
        .order('id_usuario', { ascending: true });

    if (error) throw error;

    return data;
};

const buscarPorId = async (id) => {
    const { data, error } = await supabase
        .from('Usuario')
        .select(CAMPOS_PUBLICOS)
        .eq('id_usuario', Number(id))
        .maybeSingle();

    if (error) throw error;

    return data;
};

const buscarPorNombre = async (nombre) => {
    const { data, error } = await supabase
        .from('Usuario')
        .select(CAMPOS_PUBLICOS)
        .ilike('nombre', `%${nombre}%`)
        .order('id_usuario', { ascending: true });

    if (error) throw error;

    return data;
};

const crear = async (datos) => {
    const {
        nombre,
        email,
        password_hash,
        telefono,
        direccion,
        id_rol
    } = datos;

    if (typeof nombre !== 'string' || !nombre.trim()) {
        return { error: 'El nombre es obligatorio' };
    }

    if (
        typeof email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
        return { error: 'El email no es válido' };
    }

    if (
        password_hash !== undefined &&
        password_hash !== null &&
        typeof password_hash !== 'string'
    ) {
        return { error: 'El hash de la contraseña no es válido' };
    }

    const usuarioNuevo = {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase()
    };

    if (password_hash) {
        usuarioNuevo.password_hash = password_hash;
    }

    if (telefono !== undefined) {
        usuarioNuevo.telefono = telefono;
    }

    if (direccion !== undefined) {
        usuarioNuevo.direccion = direccion;
    }

    if (id_rol !== undefined) {
        usuarioNuevo.id_rol = id_rol;
    }

    const { data, error } = await supabase
        .from('Usuario')
        .insert(usuarioNuevo)
        .select(CAMPOS_PUBLICOS)
        .single();

    if (error) {
        if (error.code === '23505') {
            return { error: 'El correo ya está registrado' };
        }

        throw error;
    }

    return { usuario: data };
};

const actualizar = async (id, datos, parcial = false) => {
    const campos = Object.keys(datos);
    const permitidos = [
        'nombre',
        'email',
        'telefono',
        'direccion',
        'id_rol',
        'password_hash'
    ];

    if (
        campos.length === 0 ||
        campos.some(campo => !permitidos.includes(campo))
    ) {
        return { error: 'Debes enviar campos válidos para actualizar' };
    }

    if (!parcial && (!datos.nombre || !datos.email)) {
        return { error: 'Nombre y email son obligatorios' };
    }

    if (datos.nombre !== undefined) {
        if (
            typeof datos.nombre !== 'string' ||
            !datos.nombre.trim()
        ) {
            return { error: 'El nombre no es válido' };
        }
    }

    if (datos.email !== undefined) {
        if (
            typeof datos.email !== 'string' ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())
        ) {
            return { error: 'El email no es válido' };
        }
    }

    if (
        datos.password_hash !== undefined &&
        datos.password_hash !== null &&
        typeof datos.password_hash !== 'string'
    ) {
        return { error: 'El hash de la contraseña no es válido' };
    }

    const cambios = { ...datos };

    if (cambios.nombre !== undefined) {
        cambios.nombre = cambios.nombre.trim();
    }

    if (cambios.email !== undefined) {
        cambios.email = cambios.email.trim().toLowerCase();
    }

    const { data, error } = await supabase
        .from('Usuario')
        .update(cambios)
        .eq('id_usuario', Number(id))
        .select(CAMPOS_PUBLICOS)
        .maybeSingle();

    if (error) {
        if (error.code === '23505') {
            return { error: 'El correo ya está registrado' };
        }

        throw error;
    }

    if (!data) return null;

    return { usuario: data };
};

const eliminar = async (id) => {
    const { data, error } = await supabase
        .from('Usuario')
        .delete()
        .eq('id_usuario', Number(id))
        .select('id_usuario');

    if (error) throw error;

    return data.length > 0;
};

module.exports = {
    obtenerTodos,
    buscarPorId,
    buscarPorNombre,
    crear,
    actualizar,
    eliminar
};
