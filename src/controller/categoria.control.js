/**
 * @file categoria.control.js
 * @description Controlador para gestionar las categorías de productos
 * (tabla TipoProducto).
 */

const categoriaServicio = require('../services/categoria.servicio');

const { obtenerIdValido, estadoDeError, errorInterno } = require('../utils/respuestas');

/**
 * Lista todas las categorías con su número de productos y stock.
 * GET /categorias
 */
const obtenerTodas = async (req, res) => {
    try {
        const categorias = await categoriaServicio.obtenerTodas();
        return res.status(200).json(categorias);
    } catch (error) {
        return errorInterno(res, 'Error al obtener categorías',
            'No se pudieron obtener las categorías', error);
    }
};

/**
 * Crea una categoría nueva.
 * POST /categorias
 */
const crear = async (req, res) => {
    try {
        const resultado = await categoriaServicio.crear(req.body);

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(201).json({
            mensaje: 'Categoría creada correctamente',
            categoria: resultado.categoria
        });
    } catch (error) {
        return errorInterno(res, 'Error al crear categoría',
            'No se pudo crear la categoría', error);
    }
};

/**
 * Renombra una categoría.
 * PATCH /categorias/:id
 */
const actualizar = async (req, res) => {
    try {
        const id = obtenerIdValido(req.params.id);
        if (!id) return res.status(400).json({ error: 'ID no válido' });

        const resultado = await categoriaServicio.actualizar(id, req.body);

        if (!resultado) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(200).json({
            mensaje: 'Categoría actualizada correctamente',
            categoria: resultado.categoria
        });
    } catch (error) {
        return errorInterno(res, 'Error al actualizar categoría',
            'No se pudo actualizar la categoría', error);
    }
};

/**
 * Elimina una categoría vacía.
 * DELETE /categorias/:id
 */
const eliminar = async (req, res) => {
    try {
        const id = obtenerIdValido(req.params.id);
        if (!id) return res.status(400).json({ error: 'ID no válido' });

        const resultado = await categoriaServicio.eliminar(id);

        if (!resultado) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(200).json({ mensaje: 'Categoría eliminada correctamente' });
    } catch (error) {
        return errorInterno(res, 'Error al eliminar categoría',
            'No se pudo eliminar la categoría', error);
    }
};

module.exports = {
    obtenerTodas,
    crear,
    actualizar,
    eliminar
};
