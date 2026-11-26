const supabase = require('../../config/supabaseClient');
const { obtenerSupabaseAdmin } = require('../../config/supabaseAdmin');

// ============================================================
// SERVICIO DE CATEGORÍAS
// La categoría de un producto vive en "TipoProducto". No se puede
// borrar una categoría que todavía tenga productos asociados.
// ============================================================

const TABLA = 'TipoProducto';
const TABLA_PRODUCTOS = 'Producto';

const LARGO_MAXIMO_NOMBRE = 60;

const MENSAJES = {
    cuerpoInvalido: 'Debes enviar un objeto JSON con los datos de la categoría',
    nombreObligatorio: 'El nombre de la categoría es obligatorio',
    nombreInvalido: 'El nombre debe tener entre 2 y 60 caracteres',
    nombreDuplicado: 'Ya existe una categoría con ese nombre',
    sinServiceRole:
        'Falta SUPABASE_SERVICE_ROLE_KEY en el .env del backend. Es necesaria para modificar categorías.',
    noExiste: 'La categoría no existe',
    categoriaEnUso:
        'No se puede eliminar la categoría porque todavía tiene productos asociados',
    datosRechazados: 'La base de datos rechazó los valores enviados'
};

const CODIGO_DUPLICADO = '23505';
const CODIGO_LLAVE_FORANEA = '23503';
const CODIGOS_DATOS_INVALIDOS = ['23514', '23502', '22003', '22001'];

const fallo = (mensaje, tipo = 'validacion') => ({ error: mensaje, tipo });

const esObjeto = (valor) =>
    typeof valor === 'object' && valor !== null && !Array.isArray(valor);

// Escapa % _ \ para que el texto buscado no actúe como comodín en ILIKE.
const escaparLike = (texto) => texto.replace(/[\\%_]/g, '\\$&');

const validarNombre = (valor) => {
    if (typeof valor !== 'string' || !valor.trim()) {
        return fallo(MENSAJES.nombreObligatorio);
    }

    const nombre = valor.trim().replace(/\s+/g, ' ');

    if (nombre.length < 2 || nombre.length > LARGO_MAXIMO_NOMBRE) {
        return fallo(MENSAJES.nombreInvalido);
    }

    return { nombre };
};

// Cliente con service role para escrituras (RLS bloquea TipoProducto
// con la clave pública).
const clienteEscritura = () => {
    const admin = obtenerSupabaseAdmin();
    if (!admin) return fallo(MENSAJES.sinServiceRole, 'servidor');
    return { admin };
};

// Conteo de productos y stock por categoría en una sola consulta.
const contarProductos = async () => {
    const { data, error } = await supabase
        .from(TABLA_PRODUCTOS)
        .select('tipo_id, stock');

    if (error) throw error;

    const conteo = new Map();

    for (const producto of data || []) {
        const registro = conteo.get(producto.tipo_id) ?? {
            productos: 0,
            stock: 0
        };

        registro.productos += 1;
        registro.stock += Number(producto.stock) || 0;
        conteo.set(producto.tipo_id, registro);
    }

    return conteo;
};

const normalizar = (fila, conteo) => {
    const registro = conteo?.get(fila.id_tipo) ?? { productos: 0, stock: 0 };

    return {
        id_tipo: fila.id_tipo,
        nombre: fila.nombre,
        productos: registro.productos,
        stock: registro.stock
    };
};

const buscarPorNombre = async (nombre, excluirId = null) => {
    let consulta = supabase
        .from(TABLA)
        .select('id_tipo, nombre')
        .ilike('nombre', escaparLike(nombre));

    if (excluirId) consulta = consulta.neq('id_tipo', excluirId);

    const { data, error } = await consulta.limit(1);

    if (error) throw error;
    return data?.[0] ?? null;
};

const traducirErrorBD = (error) => {
    if (error.code === CODIGO_DUPLICADO) return fallo(MENSAJES.nombreDuplicado, 'conflicto');
    if (error.code === CODIGO_LLAVE_FORANEA) return fallo(MENSAJES.categoriaEnUso, 'conflicto');
    if (CODIGOS_DATOS_INVALIDOS.includes(error.code)) {
        return fallo(MENSAJES.datosRechazados);
    }
    return null;
};

// ---------------- CONSULTAS ----------------

const obtenerTodas = async () => {
    const [{ data, error }, conteo] = await Promise.all([
        supabase
            .from(TABLA)
            .select('id_tipo, nombre')
            .order('nombre', { ascending: true }),
        contarProductos()
    ]);

    if (error) throw error;

    return (data || []).map((fila) => normalizar(fila, conteo));
};

const buscarPorId = async (id) => {
    const { data, error } = await supabase
        .from(TABLA)
        .select('id_tipo, nombre')
        .eq('id_tipo', Number(id))
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const conteo = await contarProductos();
    return normalizar(data, conteo);
};

// ---------------- ESCRITURA ----------------

const crear = async (datos) => {
    if (!esObjeto(datos)) return fallo(MENSAJES.cuerpoInvalido);

    const validacion = validarNombre(datos.nombre);
    if (validacion.error) return validacion;

    const duplicada = await buscarPorNombre(validacion.nombre);
    if (duplicada) return fallo(MENSAJES.nombreDuplicado, 'conflicto');

    const cliente = clienteEscritura();
    if (cliente.error) return cliente;

    const { data, error } = await cliente.admin
        .from(TABLA)
        .insert({ nombre: validacion.nombre })
        .select('id_tipo, nombre')
        .single();

    if (error) {
        const conocido = traducirErrorBD(error);
        if (conocido) return conocido;
        throw error;
    }

    return { categoria: normalizar(data) };
};

const actualizar = async (id, datos) => {
    if (!esObjeto(datos)) return fallo(MENSAJES.cuerpoInvalido);

    const validacion = validarNombre(datos.nombre);
    if (validacion.error) return validacion;

    const existente = await buscarPorId(id);
    if (!existente) return null;

    const duplicada = await buscarPorNombre(validacion.nombre, Number(id));
    if (duplicada) return fallo(MENSAJES.nombreDuplicado, 'conflicto');

    const cliente = clienteEscritura();
    if (cliente.error) return cliente;

    const { data, error } = await cliente.admin
        .from(TABLA)
        .update({ nombre: validacion.nombre })
        .eq('id_tipo', Number(id))
        .select('id_tipo, nombre')
        .maybeSingle();

    if (error) {
        const conocido = traducirErrorBD(error);
        if (conocido) return conocido;
        throw error;
    }

    if (!data) return null;

    return { categoria: normalizar(data) };
};

const eliminar = async (id) => {
    const existente = await buscarPorId(id);
    if (!existente) return null;

    if (existente.productos > 0) {
        return fallo(
            `No se puede eliminar "${existente.nombre}" porque tiene ${existente.productos} producto(s) asociado(s). Muévelos a otra categoría primero.`,
            'conflicto'
        );
    }

    const cliente = clienteEscritura();
    if (cliente.error) return cliente;

    const { data, error } = await cliente.admin
        .from(TABLA)
        .delete()
        .eq('id_tipo', Number(id))
        .select('id_tipo');

    if (error) {
        const conocido = traducirErrorBD(error);
        if (conocido) return conocido;
        throw error;
    }

    if (!data || data.length === 0) return null;

    return { eliminado: true };
};

module.exports = {
    obtenerTodas,
    buscarPorId,
    crear,
    actualizar,
    eliminar
};
