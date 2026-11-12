const supabase = require('../../config/supabaseClient');

const TABLA = 'usuarios'; // Cambia a 'Usuario' si en tu BD está con mayúscula exacta
const CAMPOS_PUBLICOS = 'id_usuario, nombre, email, telefono, direccion, fecha_registro, id_rol';

// 1. Obtener todos los usuarios
const obtenerTodos = async () => {
    const { data, error } = await supabase
        .from(TABLA)
        .select(CAMPOS_PUBLICOS)
        .order('id_usuario', { ascending: true });

    if (error) throw error;
    return data;
};

// 2. Buscar usuario por ID
const buscarPorId = async (id) => {
    const { data, error } = await supabase
        .from(TABLA)
        .select(CAMPOS_PUBLICOS)
        .eq('id_usuario', Number(id))
        .maybeSingle();

    if (error) throw error;
    return data;
};

// 3. Crear usuario
const crear = async (datos) => {
    const { nombre, email, password_hash, telefono, direccion, id_rol } = datos;

    // Validaciones básicas esenciales
    if (!nombre || !email || !password_hash) {
        return { error: 'Nombre, email y contraseña son obligatorios', tipo: 'validacion' };
    }

    console.log("Pasa la validacion, linea 38")

    const { data, error } = await supabase
        .from(TABLA)
        .insert([{ 
            nombre, 
            email, 
            password_hash, 
            telefono: telefono || null, 
            direccion: direccion || null, 
            id_rol: id_rol || 2 
        }])
        .select(CAMPOS_PUBLICOS)
        .single();

    if (error) {
        // Código 23505: Llave única duplicada (ej. email repetido)
        if (error.code === '23505') {
            return { error: 'El correo ya está registrado', tipo: 'conflicto' };
        }
        throw error;
    }

    console.log(data);

    return { usuario: data };
};

// 4. Actualizar usuario (PUT / PATCH)
const actualizar = async (id, datos) => {
    const { data, error } = await supabase
        .from(TABLA)
        .update(datos)
        .eq('id_usuario', Number(id))
        .select(CAMPOS_PUBLICOS)
        .maybeSingle();

    if (error) {
        if (error.code === '23505') {
            return { error: 'El correo ya está registrado', tipo: 'conflicto' };
        }
        throw error;
    }

    if (!data) return null; // Retorna null si el usuario no existe

    return { usuario: data };
};

// 5. Eliminar usuario
const eliminar = async (id) => {
    const { data, error } = await supabase
        .from(TABLA)
        .delete()
        .eq('id_usuario', Number(id))
        .select('id_usuario');

    if (error) {
        // Código 23503: Violación de llave foránea (en uso por otra tabla)
        if (error.code === '23503') {
            return { error: 'No se puede eliminar el usuario porque tiene registros asociados', tipo: 'conflicto' };
        }
        throw error;
    }

    if (!data || data.length === 0) return null; // Si no existía

    return { eliminado: true };
};

module.exports = {
    obtenerTodos,
    buscarPorId,
    crear,
    actualizar,
    eliminar
};