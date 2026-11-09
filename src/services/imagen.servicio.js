const { obtenerSupabaseAdmin } = require('../../config/supabaseAdmin');

// ============================================================
// IMÁGENES DE PRODUCTOS
// El archivo se sube a Supabase Storage (bucket público) y en
// "ImagenProducto" solo se guarda la URL. Nunca se guarda el
// binario dentro de Postgres.
// ============================================================

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'productos';

const TABLA_PRODUCTOS = 'Producto';
const TABLA_IMAGENES = 'ImagenProducto';

const EXTENSIONES = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif'
};

const MENSAJES = {
    sinServiceRole:
        'Falta SUPABASE_SERVICE_ROLE_KEY en el .env del backend. Es necesaria para subir archivos a Storage.',
    sinArchivos:
        'Debes enviar al menos una imagen en el campo "imagen" o "imagenes"',
    productoNoExiste: 'El producto no existe',
    bucket:
        'No se pudo preparar el bucket de Storage. Revisa la service role key y los permisos.'
};

const fallo = (mensaje, tipo = 'validacion') => ({ error: mensaje, tipo });

// Convierte "Conjunto Encaje (1).JPG" en "conjunto-encaje-1" para la ruta.
const limpiarNombre = (nombre = '') =>
    nombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'imagen';

const crearBucketSiFalta = async (admin) => {
    const { error } = await admin.storage.getBucket(BUCKET);

    if (!error) return null;

    const { error: errorCrear } = await admin.storage.createBucket(BUCKET, {
        public: true
    });

    if (errorCrear && !/already exists/i.test(errorCrear.message)) {
        console.error('No se pudo crear el bucket:', errorCrear.message);
        return fallo(MENSAJES.bucket, 'servidor');
    }

    return null;
};

const borrarArchivos = async (admin, rutas) => {
    if (rutas.length === 0) return;

    const { error } = await admin.storage.from(BUCKET).remove(rutas);
    if (error) {
        console.error('No se pudieron borrar archivos huérfanos:', error.message);
    }
};

/**
 * Sube una o varias imágenes de un producto.
 * @param {number} productoId
 * @param {Array} archivos archivos de multer (memoryStorage)
 * @param {{ esPrincipal?: boolean }} opciones
 */
const subirImagenes = async (productoId, archivos, opciones = {}) => {
    if (!Array.isArray(archivos) || archivos.length === 0) {
        return fallo(MENSAJES.sinArchivos);
    }

    const admin = obtenerSupabaseAdmin();

    if (!admin) return fallo(MENSAJES.sinServiceRole, 'servidor');

    const { data: producto, error: errorProducto } = await admin
        .from(TABLA_PRODUCTOS)
        .select('id_producto')
        .eq('id_producto', productoId)
        .maybeSingle();

    if (errorProducto) throw errorProducto;
    if (!producto) return { noEncontrado: true };

    const errorBucket = await crearBucketSiFalta(admin);
    if (errorBucket) return errorBucket;

    // Último orden para continuar la galería.
    const { data: ultima, error: errorOrden } = await admin
        .from(TABLA_IMAGENES)
        .select('orden')
        .eq('producto_id', productoId)
        .order('orden', { ascending: false })
        .limit(1);

    if (errorOrden) throw errorOrden;

    let siguienteOrden = ultima?.[0] ? Number(ultima[0].orden) + 1 : 0;

    // ¿El producto ya tiene una imagen principal?
    const { data: principal, error: errorPrincipal } = await admin
        .from(TABLA_IMAGENES)
        .select('id_imagen')
        .eq('producto_id', productoId)
        .eq('es_principal', true)
        .limit(1);

    if (errorPrincipal) throw errorPrincipal;

    const yaTienePrincipal = Boolean(principal?.[0]);
    const quierePrincipal = opciones.esPrincipal === true;

    // Solo puede haber una principal por producto. Si se pide cambiarla,
    // se desmarca la anterior antes de insertar (índice único parcial).
    if (quierePrincipal && yaTienePrincipal) {
        const { error } = await admin
            .from(TABLA_IMAGENES)
            .update({ es_principal: false })
            .eq('producto_id', productoId)
            .eq('es_principal', true);

        if (error) throw error;
    }

    const marcarPrimera = quierePrincipal || !yaTienePrincipal;

    const rutasSubidas = [];
    const filas = [];

    for (const [indice, archivo] of archivos.entries()) {
        const extension = EXTENSIONES[archivo.mimetype] || 'jpg';
        const ruta = `${productoId}/${Date.now()}-${indice}-${limpiarNombre(archivo.originalname)}.${extension}`;

        const { error } = await admin.storage
            .from(BUCKET)
            .upload(ruta, archivo.buffer, {
                contentType: archivo.mimetype,
                cacheControl: '31536000',
                upsert: false
            });

        if (error) {
            await borrarArchivos(admin, rutasSubidas);
            console.error('Error al subir a Storage:', error.message);
            return fallo(
                `No se pudo subir "${archivo.originalname}". Inténtalo de nuevo.`,
                'servidor'
            );
        }

        rutasSubidas.push(ruta);

        const { data: publica } = admin.storage
            .from(BUCKET)
            .getPublicUrl(ruta);

        filas.push({
            producto_id: productoId,
            url: publica.publicUrl,
            orden: siguienteOrden++,
            es_principal: marcarPrimera && indice === 0
        });
    }

    const { data: imagenes, error: errorInsertar } = await admin
        .from(TABLA_IMAGENES)
        .insert(filas)
        .select('id_imagen, producto_id, url, orden, es_principal');

    if (errorInsertar) {
        // Si la base falló, se eliminan los archivos recién subidos.
        await borrarArchivos(admin, rutasSubidas);
        throw errorInsertar;
    }

    return { imagenes, bucket: BUCKET };
};

module.exports = { subirImagenes, BUCKET };
