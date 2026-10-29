// ============================================================
// SERVICIO DE USUARIOS
// Aquí vive toda la lógica de negocio y las consultas a Supabase.
// El controlador NO habla con Supabase directamente: usa este archivo.
//
// Convención de respuestas:
//   - Éxito:              { usuario: {...} }
//   - Error controlado:   { error: 'mensaje', tipo: 'validacion' | 'conflicto' }
//   - No existe:          null
//   - Error inesperado:   se lanza (throw) y lo atrapa el controlador
// ============================================================
 
const supabase = require('../../config/supabaseClient');
 
// ------------------------------------------------------------
// CONSTANTES
// ------------------------------------------------------------
 
const TABLA = 'Usuario';
 
// Campos que se devuelven al cliente. password_hash NO está incluido
// a propósito para que nunca salga en las respuestas.
const CAMPOS_PUBLICOS =
    'id_usuario, nombre, email, telefono, direccion, fecha_registro, id_rol';
 
// Campos que el cliente puede enviar al crear o actualizar
const CAMPOS_PERMITIDOS = [
    'nombre',
    'email',
    'telefono',
    'direccion',
    'id_rol',
    'password_hash'
];
 
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 
// Códigos de error de PostgreSQL que devuelve Supabase
const CODIGO_DUPLICADO = '23505';     // restricción UNIQUE (email repetido)
const CODIGO_LLAVE_FORANEA = '23503'; // referencia a un registro que no existe / en uso
 
const MENSAJES = {
    cuerpoInvalido: 'Debes enviar un objeto JSON con los datos del usuario',
    sinCampos: 'Debes enviar al menos un campo para actualizar',
    nombreObligatorio: 'El nombre es obligatorio',
    emailObligatorio: 'El email es obligatorio',
    nombreEmailObligatorios: 'Nombre y email son obligatorios',
    nombreInvalido: 'El nombre no es válido',
    emailInvalido: 'El email no es válido',
    passwordInvalido: 'El hash de la contraseña no es válido',
    telefonoInvalido: 'El teléfono no es válido',
    direccionInvalida: 'La dirección no es válida',
    rolInvalido: 'El id_rol debe ser un número entero positivo',
    correoDuplicado: 'El correo ya está registrado',
    rolInexistente: 'El rol indicado no existe',
    usuarioEnUso:
        'No se puede eliminar el usuario porque tiene registros asociados'
};
 
// ------------------------------------------------------------
// FUNCIONES AUXILIARES
// ------------------------------------------------------------
 
// Crea una respuesta de error controlado
const fallo = (mensaje, tipo = 'validacion') => ({ error: mensaje, tipo });
 
// true si el valor es un objeto normal ({}), no null ni arreglo
const esObjeto = (valor) =>
    typeof valor === 'object' && valor !== null && !Array.isArray(valor);
 
// Escapa los comodines de LIKE (% _ \) para que una búsqueda como "50%"
// se trate como texto literal y no como comodín
const escaparComodines = (texto) => texto.replace(/[\\%_]/g, '\\$&');
 
// Traduce errores de la base de datos a mensajes entendibles.
// Devuelve null si el error no es uno de los esperados.
const traducirErrorBD = (error) => {
    if (error.code === CODIGO_DUPLICADO) {
        return fallo(MENSAJES.correoDuplicado, 'conflicto');
    }
 
    if (error.code === CODIGO_LLAVE_FORANEA) {
        return fallo(MENSAJES.rolInexistente);
    }
 
    return null;
};
 
// Valida y limpia los datos recibidos.
//   modo 'crear'    -> nombre y email obligatorios
//   modo 'completo' -> (PUT) nombre y email obligatorios
//   modo 'parcial'  -> (PATCH) solo se validan los campos enviados
// Devuelve { valores } con los datos listos para guardar, o { error }.
const validarYNormalizar = (datos, modo) => {
    const valores = {};
 
    // ---- Campos obligatorios según el modo ----
    if (modo === 'crear') {
        if (datos.nombre === undefined) {
            return { error: MENSAJES.nombreObligatorio };
        }
 
        if (datos.email === undefined) {
            return { error: MENSAJES.emailObligatorio };
        }
    }
 
    if (
        modo === 'completo' &&
        (datos.nombre === undefined || datos.email === undefined)
    ) {
        return { error: MENSAJES.nombreEmailObligatorios };
    }
 
    // ---- nombre ----
    if (datos.nombre !== undefined) {
        if (typeof datos.nombre !== 'string' || !datos.nombre.trim()) {
            return {
                error:
                    modo === 'crear'
                        ? MENSAJES.nombreObligatorio
                        : MENSAJES.nombreInvalido
            };
        }
 
        valores.nombre = datos.nombre.trim();
    }
 
    // ---- email ----
    if (datos.email !== undefined) {
        if (
            typeof datos.email !== 'string' ||
            !REGEX_EMAIL.test(datos.email.trim())
        ) {
            return { error: MENSAJES.emailInvalido };
        }
 
        valores.email = datos.email.trim().toLowerCase();
    }
 
    // ---- password_hash ----
    // Al crear se permite omitirlo o enviarlo null; al actualizar,
    // si se envía, debe ser un texto no vacío.
    if (datos.password_hash !== undefined) {
        const omitirAlCrear = modo === 'crear' && datos.password_hash === null;
 
        if (!omitirAlCrear) {
            if (
                typeof datos.password_hash !== 'string' ||
                !datos.password_hash.trim()
            ) {
                return { error: MENSAJES.passwordInvalido };
            }
 
            valores.password_hash = datos.password_hash;
        }
    }
 
    // ---- telefono (texto o null) ----
    if (datos.telefono !== undefined) {
        if (datos.telefono !== null && typeof datos.telefono !== 'string') {
            return { error: MENSAJES.telefonoInvalido };
        }
 
        valores.telefono =
            datos.telefono === null ? null : datos.telefono.trim() || null;
    }
 
    // ---- direccion (texto o null) ----
    if (datos.direccion !== undefined) {
        if (datos.direccion !== null && typeof datos.direccion !== 'string') {
            return { error: MENSAJES.direccionInvalida };
        }
 
        valores.direccion =
            datos.direccion === null ? null : datos.direccion.trim() || null;
    }
 
    // ---- id_rol (entero positivo o null) ----
    if (datos.id_rol !== undefined) {
        if (
            datos.id_rol !== null &&
            (!Number.isInteger(datos.id_rol) || datos.id_rol <= 0)
        ) {
            return { error: MENSAJES.rolInvalido };
        }
 
        valores.id_rol = datos.id_rol;
    }
 
    return { valores };
};
 
// ------------------------------------------------------------
// CONSULTAS
// ------------------------------------------------------------
 
// Obtener todos los usuarios
const obtenerTodos = async () => {
    const { data, error } = await supabase
        .from(TABLA)
        .select(CAMPOS_PUBLICOS)
        .order('id_usuario', { ascending: true });
 
    if (error) throw error;
 
    return data;
};
 
// Buscar un usuario por ID. Devuelve null si no existe.
const buscarPorId = async (id) => {
    const { data, error } = await supabase
        .from(TABLA)
        .select(CAMPOS_PUBLICOS)
        .eq('id_usuario', Number(id))
        .maybeSingle();
 
    if (error) throw error;
 
    return data;
};
 
// Buscar usuarios cuyo nombre contenga el texto (sin importar mayúsculas)
const buscarPorNombre = async (nombre) => {
    const { data, error } = await supabase
        .from(TABLA)
        .select(CAMPOS_PUBLICOS)
        .ilike('nombre', `%${escaparComodines(nombre)}%`)
        .order('id_usuario', { ascending: true });
 
    if (error) throw error;
 
    return data;
};
 
// ------------------------------------------------------------
// ESCRITURA
// ------------------------------------------------------------
 
// Crear un usuario
const crear = async (datos) => {
    if (!esObjeto(datos)) {
        return fallo(MENSAJES.cuerpoInvalido);
    }
 
    const validacion = validarYNormalizar(datos, 'crear');
 
    if (validacion.error) {
        return fallo(validacion.error);
    }
 
    const { data, error } = await supabase
        .from(TABLA)
        .insert(validacion.valores)
        .select(CAMPOS_PUBLICOS)
        .single();
 
    if (error) {
        const errorConocido = traducirErrorBD(error);
 
        if (errorConocido) return errorConocido;
 
        throw error;
    }
 
    return { usuario: data };
};
 
// Actualizar un usuario.
//   parcial = false -> PUT   (nombre y email obligatorios)
//   parcial = true  -> PATCH (solo los campos enviados)
// Devuelve null si el usuario no existe.
const actualizar = async (id, datos, parcial = false) => {
    if (!esObjeto(datos)) {
        return fallo(MENSAJES.cuerpoInvalido);
    }
 
    const campos = Object.keys(datos);
 
    if (campos.length === 0) {
        return fallo(MENSAJES.sinCampos);
    }
 
    const noPermitidos = campos.filter(
        (campo) => !CAMPOS_PERMITIDOS.includes(campo)
    );
 
    if (noPermitidos.length > 0) {
        return fallo(`Campos no permitidos: ${noPermitidos.join(', ')}`);
    }
 
    const validacion = validarYNormalizar(
        datos,
        parcial ? 'parcial' : 'completo'
    );
 
    if (validacion.error) {
        return fallo(validacion.error);
    }
 
    const { data, error } = await supabase
        .from(TABLA)
        .update(validacion.valores)
        .eq('id_usuario', Number(id))
        .select(CAMPOS_PUBLICOS)
        .maybeSingle();
 
    if (error) {
        const errorConocido = traducirErrorBD(error);
 
        if (errorConocido) return errorConocido;
 
        throw error;
    }
 
    if (!data) return null;
 
    return { usuario: data };
};
 
// Eliminar un usuario.
// Devuelve { eliminado: true }, null si no existe, o { error } si está en uso.
const eliminar = async (id) => {
    const { data, error } = await supabase
        .from(TABLA)
        .delete()
        .eq('id_usuario', Number(id))
        .select('id_usuario');
 
    if (error) {
        if (error.code === CODIGO_LLAVE_FORANEA) {
            return fallo(MENSAJES.usuarioEnUso, 'conflicto');
        }
 
        throw error;
    }
 
    if (!data || data.length === 0) return null;
 
    return { eliminado: true };
};
 
module.exports = {
    obtenerTodos,
    buscarPorId,
    buscarPorNombre,
    crear,
    actualizar,
    eliminar
};
 