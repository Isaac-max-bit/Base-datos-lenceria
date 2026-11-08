/**
 * @file lenceria.control.js
 * @description Controlador para gestionar las peticiones HTTP de productos de lencería.
 */

const lenceriaServicio = require('../services/lenceria.servicio');

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

module.exports = {
    obtenerTodos,
    buscarPorId,
    crear,
    actualizarCompleto,
    actualizarParcial,
    eliminar
};