/**
 * @file lenceria.control.js
 * @description Controlador para gestionar las peticiones HTTP de productos de lencería.
 */

const lenceriaServicio = require('../services/lenceria.servicio');
const imagenServicio = require('../services/imagen.servicio');

const { obtenerIdValido, estadoDeError, errorInterno } = require('../utils/respuestas');

// ==========================================
// CONTROLADORES DE RUTA
// ==========================================

/**
 * Obtiene la lista completa de productos.
 */
const obtenerTodos = async (req, res) => {
    try {
        const productos = await lenceriaServicio.obtenerTodos();
        return res.status(200).json(productos);
    } catch (error) {
        return errorInterno(res, 'Error al obtener productos',
            'No se pudieron obtener los productos', error);
    }
};

/**
 * Busca un producto específico por su ID.
 */
const buscarPorId = async (req, res) => {
    try {
        const id = obtenerIdValido(req.params.id);
        if (!id) return res.status(400).json({ error: 'ID no válido' });

        const producto = await lenceriaServicio.buscarPorId(id);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        return res.status(200).json(producto);
    } catch (error) {
        return errorInterno(res, 'Error al buscar producto',
            'No se pudo buscar el producto', error);
    }
};

/**
 * Busca productos por coincidencia en el nombre.
 * GET /productos/buscar?q=encaje
 */
const buscarPorTexto = async (req, res) => {
    try {
        const termino = (req.query.q ?? req.query.nombre ?? '').trim();

        if (!termino) {
            return res.status(400).json({ error: 'Debes indicar un término de búsqueda' });
        }

        const productos = await lenceriaServicio.buscarPorTexto(termino);

        return res.status(200).json(productos);
    } catch (error) {
        return errorInterno(res, 'Error al buscar productos',
            'No se pudo realizar la búsqueda', error);
    }
};

/**
 * Crea un nuevo producto de lencería.
 */
const crear = async (req, res) => {
    try {
        const resultado = await lenceriaServicio.crear(req.body);

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(201).json(resultado.producto);
    } catch (error) {
        return errorInterno(res, 'Error al crear producto',
            'No se pudo crear el producto', error);
    }
};

/**
 * Fábrica de funciones para actualizar registros (utilizada tanto para PUT como para PATCH).
 * @param {boolean} parcial - Indica si la actualización es parcial (true) o completa (false).
 */
const crearActualizador = (parcial) => async (req, res) => {
    try {
        const id = obtenerIdValido(req.params.id);
        if (!id) return res.status(400).json({ error: 'ID no válido' });

        const resultado = await lenceriaServicio.actualizar(id, req.body, parcial);

        if (!resultado) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(200).json(resultado.producto);
    } catch (error) {
        return errorInterno(res,
            `Error al actualizar producto (${parcial ? 'PATCH' : 'PUT'})`,
            'No se pudo actualizar el producto', error);
    }
};

// Instanciación de actualizadores
const actualizarCompleto = crearActualizador(false);
const actualizarParcial = crearActualizador(true);

/**
 * Elimina un producto por su ID.
 */
const eliminar = async (req, res) => {
    try {
        const id = obtenerIdValido(req.params.id);
        if (!id) return res.status(400).json({ error: 'ID no válido' });

        const resultado = await lenceriaServicio.eliminar(id);

        if (!resultado) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(200).json({ mensaje: 'Producto eliminado correctamente' });
    } catch (error) {
        return errorInterno(res, 'Error al eliminar producto',
            'No se pudo eliminar el producto', error);
    }
};

// Sube una o varias imágenes de un producto
const subirImagenes = async (req, res) => {
    try {
        const id = obtenerIdValido(req.params.id);
        if (!id) return res.status(400).json({ error: 'ID no válido' });

        const archivos = [
            ...(req.files?.imagen ?? []),
            ...(req.files?.imagenes ?? [])
        ];

        const esPrincipal = ['true', '1', 'si', 'sí'].includes(
            String(req.body?.es_principal ?? '').toLowerCase()
        );

        const resultado = await imagenServicio.subirImagenes(id, archivos, {
            esPrincipal
        });

        if (resultado.noEncontrado) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        if (resultado.error) {
            return res
                .status(estadoDeError(resultado))
                .json({ error: resultado.error });
        }

        return res.status(201).json({
            mensaje: `${resultado.imagenes.length} imagen(es) subida(s)`,
            producto_id: id,
            bucket: resultado.bucket,
            imagenes: resultado.imagenes
        });
    } catch (error) {
        return errorInterno(res, 'Error al subir imágenes',
            'No se pudieron subir las imágenes', error);
    }
};

module.exports = {
    obtenerTodos,
    buscarPorId,
    buscarPorTexto,
    crear,
    actualizarCompleto,
    actualizarParcial,
    eliminar,
    subirImagenes
};