const supabase = require('../../config/supabaseClient');

const TABLA = 'Producto';

const CAMPOS_PUBLICOS =
    'id_producto, nombre, descripcion, precio, stock, fecha_creacion';

const CAMPOS_PERMITIDOS = ['nombre', 'descripcion', 'precio', 'stock'];

const CODIGO_LLAVE_FORANEA = '23503';
const CODIGO_CHECK = '23514';

const MENSAJES = {
    cuerpoInvalido: 'Debes enviar un objeto JSON con los datos del producto',
    sinCampos: 'Debes enviar al menos un campo para actualizar',
    nombreObligatorio: 'El nombre es obligatorio',
    precioObligatorio: 'El precio es obligatorio',
    stockObligatorio: 'El stock es obligatorio',
    camposObligatorios: 'Nombre, precio y stock son obligatorios',
    nombreInvalido: 'El nombre no es válido',
    descripcionInvalida: 'La descripción no es válida',
    precioInvalido: 'El precio debe ser un número válido no negativo',
    stockInvalido: 'El stock debe ser un entero no negativo',
    datosRechazados: 'La base de datos rechazó los valores enviados',
    productoEnUso:
        'No se puede eliminar el producto porque tiene registros asociados'
};

const fallo = (mensaje, tipo = 'validacion') => ({ error: mensaje, tipo });

const esObjeto = (valor) =>
    typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const validarYNormalizar = (datos, modo) => {
    const valores = {};

    if (modo !== 'parcial') {
        if (datos.nombre === undefined && datos.precio === undefined && datos.stock === undefined) {
            return { error: MENSAJES.camposObligatorios };
        }
        if (datos.nombre === undefined) return { error: MENSAJES.nombreObligatorio };
        if (datos.precio === undefined) return { error: MENSAJES.precioObligatorio };
        if (datos.stock === undefined) return { error: MENSAJES.stockObligatorio };
    }

    if (datos.nombre !== undefined) {
        if (typeof datos.nombre !== 'string' || !datos.nombre.trim()) {
            return {
                error: modo === 'parcial'
                    ? MENSAJES.nombreInvalido
                    : MENSAJES.nombreObligatorio
            };
        }
        valores.nombre = datos.nombre.trim();
    }

    if (datos.descripcion !== undefined) {
        if (datos.descripcion !== null && typeof datos.descripcion !== 'string') {
            return { error: MENSAJES.descripcionInvalida };
        }
        valores.descripcion =
            datos.descripcion === null ? null : datos.descripcion.trim() || null;
    }

    if (datos.precio !== undefined) {
        if (
            typeof datos.precio !== 'number' ||
            !Number.isFinite(datos.precio) ||
            datos.precio < 0
        ) {
            return { error: MENSAJES.precioInvalido };
        }
        valores.precio = datos.precio;
    }

    if (datos.stock !== undefined) {
        if (!Number.isInteger(datos.stock) || datos.stock < 0) {
            return { error: MENSAJES.stockInvalido };
        }
        valores.stock = datos.stock;
    }

    return { valores };
};

const traducirErrorBD = (error) => {
    if (error.code === CODIGO_CHECK) return fallo(MENSAJES.datosRechazados);
    return null;
};

// ---------------- CONSULTAS ----------------

const obtenerTodos = async () => {
    const { data, error } = await supabase
        .from(TABLA)
        .select(CAMPOS_PUBLICOS)
        .order('id_producto', { ascending: true });

    if (error) throw error;
    return data;
};

const buscarPorId = async (id) => {
    const { data, error } = await supabase
        .from(TABLA)
        .select(CAMPOS_PUBLICOS)
        .eq('id_producto', Number(id))
        .maybeSingle();

    if (error) throw error;
    return data;
};

// ---------------- ESCRITURA ----------------

const crear = async (datos) => {
    if (!esObjeto(datos)) return fallo(MENSAJES.cuerpoInvalido);

    const validacion = validarYNormalizar(datos, 'crear');
    if (validacion.error) return fallo(validacion.error);

    const { data, error } = await supabase
        .from(TABLA)
        .insert(validacion.valores)
        .select(CAMPOS_PUBLICOS)
        .single();

    if (error) {
        const conocido = traducirErrorBD(error);
        if (conocido) return conocido;
        throw error;
    }

    return { producto: data };
};

const actualizar = async (id, datos, parcial = false) => {
    if (!esObjeto(datos)) return fallo(MENSAJES.cuerpoInvalido);

    const campos = Object.keys(datos);
    if (campos.length === 0) return fallo(MENSAJES.sinCampos);

    const noPermitidos = campos.filter((c) => !CAMPOS_PERMITIDOS.includes(c));
    if (noPermitidos.length > 0) {
        return fallo(`Campos no permitidos: ${noPermitidos.join(', ')}`);
    }

    const validacion = validarYNormalizar(datos, parcial ? 'parcial' : 'completo');
    if (validacion.error) return fallo(validacion.error);

    const { data, error } = await supabase
        .from(TABLA)
        .update(validacion.valores)
        .eq('id_producto', Number(id))
        .select(CAMPOS_PUBLICOS)
        .maybeSingle();

    if (error) {
        const conocido = traducirErrorBD(error);
        if (conocido) return conocido;
        throw error;
    }

    if (!data) return null;
    return { producto: data };
};

const eliminar = async (id) => {
    const { data, error } = await supabase
        .from(TABLA)
        .delete()
        .eq('id_producto', Number(id))
        .select('id_producto');

    if (error) {
        if (error.code === CODIGO_LLAVE_FORANEA) {
            return fallo(MENSAJES.productoEnUso, 'conflicto');
        }
        throw error;
    }

    if (!data || data.length === 0) return null;
    return { eliminado: true };
};

module.exports = { obtenerTodos, buscarPorId, crear, actualizar, eliminar };