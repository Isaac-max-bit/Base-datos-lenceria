const supabase = require('../../config/supabaseClient');

const TABLA = 'Producto';

// Relaciones reales de la base:
//   Producto.tipo_id            -> TipoProducto (categoría)
//   VarianteProducto.producto_id -> Producto (talla, color, stock)
//   ImagenProducto.producto_id   -> Producto (una o varias imágenes)
const CAMPOS_PUBLICOS = `
    *,
    TipoProducto ( id_tipo, nombre ),
    VarianteProducto ( id_variante, talla, color, stock ),
    ImagenProducto ( id_imagen, url, orden, es_principal )
`;

// Columnas que el administrador puede modificar directamente en Producto.
// La categoría se cambia con tipo_id. El color y las imágenes se gestionan
// en VarianteProducto e ImagenProducto.
const CAMPOS_PERMITIDOS = [
    'nombre',
    'descripcion',
    'precio',
    'precio_anterior',
    'stock',
    'tipo_id'
];

const CODIGO_LLAVE_FORANEA = '23503';
const CODIGO_CHECK = '23514';
// Otros errores de datos inválidos que NO deben salir como 500:
// 23502 NOT NULL · 22003 número fuera de rango · 22001 texto demasiado largo
const CODIGOS_DATOS_INVALIDOS = [CODIGO_CHECK, '23502', '22003', '22001'];

const MENSAJES = {
    cuerpoInvalido: 'Debes enviar un objeto JSON con los datos del producto',
    sinCampos: 'Debes enviar al menos un campo para actualizar',
    nombreObligatorio: 'El nombre es obligatorio',
    precioObligatorio: 'El precio es obligatorio',
    stockObligatorio: 'El stock es obligatorio',
    tipoObligatorio: 'El tipo de producto es obligatorio',
    camposObligatorios: 'Nombre, precio, stock y tipo son obligatorios',
    nombreInvalido: 'El nombre no es válido',
    descripcionInvalida: 'La descripción no es válida',
    precioInvalido: 'El precio debe ser un número válido no negativo',
    precioAnteriorInvalido:
        'El precio anterior debe ser un número válido no negativo o null',
    stockInvalido: 'El stock debe ser un entero no negativo',
    tipoInvalido: 'El tipo de producto debe ser un entero válido',
    tipoNoExiste: 'El tipo de producto no existe',
    datosRechazados: 'La base de datos rechazó los valores enviados',
    productoEnUso:
        'No se puede eliminar el producto porque tiene registros asociados'
};

const fallo = (mensaje, tipo = 'validacion') => ({ error: mensaje, tipo });

const esObjeto = (valor) =>
    typeof valor === 'object' && valor !== null && !Array.isArray(valor);

// Escapa % _ \ para que el texto buscado no actúe como comodín en ILIKE.
const escaparLike = (texto) => texto.replace(/[\\%_]/g, '\\$&');

const validarYNormalizar = (datos, modo) => {
    const valores = {};

    if (modo !== 'parcial') {
        if (
            datos.nombre === undefined &&
            datos.precio === undefined &&
            datos.stock === undefined &&
            datos.tipo_id === undefined
        ) {
            return { error: MENSAJES.camposObligatorios };
        }
        if (datos.nombre === undefined) return { error: MENSAJES.nombreObligatorio };
        if (datos.precio === undefined) return { error: MENSAJES.precioObligatorio };
        if (datos.stock === undefined) return { error: MENSAJES.stockObligatorio };
        if (datos.tipo_id === undefined) return { error: MENSAJES.tipoObligatorio };
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

    if (datos.precio_anterior !== undefined) {
        if (datos.precio_anterior === null) {
            valores.precio_anterior = null;
        } else if (
            typeof datos.precio_anterior !== 'number' ||
            !Number.isFinite(datos.precio_anterior) ||
            datos.precio_anterior < 0
        ) {
            return { error: MENSAJES.precioAnteriorInvalido };
        } else {
            valores.precio_anterior = datos.precio_anterior;
        }
    }

    if (datos.stock !== undefined) {
        if (!Number.isInteger(datos.stock) || datos.stock < 0) {
            return { error: MENSAJES.stockInvalido };
        }
        valores.stock = datos.stock;
    }

    if (datos.tipo_id !== undefined) {
        if (!Number.isInteger(datos.tipo_id) || datos.tipo_id <= 0) {
            return { error: MENSAJES.tipoInvalido };
        }
        valores.tipo_id = datos.tipo_id;
    }

    return { valores };
};

// Devuelve un error si el cliente envía campos que no se pueden modificar.
const validarCamposPermitidos = (datos) => {
    const noPermitidos = Object.keys(datos).filter(
        (c) => !CAMPOS_PERMITIDOS.includes(c)
    );
    return noPermitidos.length > 0
        ? fallo(`Campos no permitidos: ${noPermitidos.join(', ')}`)
        : null;
};

const traducirErrorBD = (error) => {
    if (error.code === CODIGO_LLAVE_FORANEA) return fallo(MENSAJES.tipoNoExiste);
    if (CODIGOS_DATOS_INVALIDOS.includes(error.code)) {
        return fallo(MENSAJES.datosRechazados);
    }
    return null;
};

// Convierte la fila anidada de Supabase en un producto plano para el front:
// categoría desde TipoProducto, colores/tallas desde VarianteProducto,
// imagen principal y galería desde ImagenProducto.
const normalizarProducto = (fila) => {
    if (!fila) return fila;

    const variantes = Array.isArray(fila.VarianteProducto)
        ? fila.VarianteProducto
        : [];

    const imagenes = Array.isArray(fila.ImagenProducto)
        ? [...fila.ImagenProducto].sort((a, b) => {
            if (Boolean(a.es_principal) !== Boolean(b.es_principal)) {
                return a.es_principal ? -1 : 1;
            }
            return (a.orden ?? 0) - (b.orden ?? 0);
        })
        : [];

    const colores = [...new Set(variantes.map((v) => v.color).filter(Boolean))];
    const tallas = [...new Set(variantes.map((v) => v.talla).filter(Boolean))];
    const stockVariantes = variantes.reduce(
        (total, v) => total + (Number(v.stock) || 0),
        0
    );

    const { TipoProducto, VarianteProducto, ImagenProducto, ...producto } = fila;

    return {
        ...producto,
        categoria: TipoProducto?.nombre ?? null,
        tipo: TipoProducto?.nombre ?? null,
        color: colores[0] ?? null,
        colores,
        tallas,
        variantes,
        imagenes,
        imagen: imagenes[0]?.url ?? null,
        stock: variantes.length > 0 ? stockVariantes : (Number(producto.stock) || 0)
    };
};

// ---------------- CONSULTAS ----------------

const obtenerTodos = async () => {
    const { data, error } = await supabase
        .from(TABLA)
        .select(CAMPOS_PUBLICOS)
        .order('id_producto', { ascending: true });

    if (error) throw error;
    return (data || []).map(normalizarProducto);
};

const buscarPorId = async (id) => {
    const { data, error } = await supabase
        .from(TABLA)
        .select(CAMPOS_PUBLICOS)
        .eq('id_producto', Number(id))
        .maybeSingle();

    if (error) throw error;
    return normalizarProducto(data);
};

// Búsqueda por texto en el nombre. Se usa desde /productos/buscar?q=...
const buscarPorTexto = async (termino) => {
    const { data, error } = await supabase
        .from(TABLA)
        .select(CAMPOS_PUBLICOS)
        .ilike('nombre', `%${escaparLike(termino)}%`)
        .order('id_producto', { ascending: true });

    if (error) throw error;
    return (data || []).map(normalizarProducto);
};

// ---------------- ESCRITURA ----------------

const crear = async (datos) => {
    if (!esObjeto(datos)) return fallo(MENSAJES.cuerpoInvalido);

    const noPermitidos = validarCamposPermitidos(datos);
    if (noPermitidos) return noPermitidos;

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

    return { producto: normalizarProducto(data) };
};

const actualizar = async (id, datos, parcial = false) => {
    if (!esObjeto(datos)) return fallo(MENSAJES.cuerpoInvalido);

    const campos = Object.keys(datos);
    if (campos.length === 0) return fallo(MENSAJES.sinCampos);

    const noPermitidos = validarCamposPermitidos(datos);
    if (noPermitidos) return noPermitidos;

    const validacion = validarYNormalizar(datos, parcial ? 'parcial' : 'completo');
    if (validacion.error) return fallo(validacion.error);

    // PUT = reemplazo completo: la descripción es opcional, pero si no llega se limpia.
    if (!parcial && validacion.valores.descripcion === undefined) {
        validacion.valores.descripcion = null;
    }

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
    return { producto: normalizarProducto(data) };
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

module.exports = {
    obtenerTodos,
    buscarPorId,
    buscarPorTexto,
    crear,
    actualizar,
    eliminar
};
