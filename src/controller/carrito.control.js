// ============================================================
// CONTROLADOR DEL CARRITO
// Todas las rutas exigen sesión: el usuario sale de req.usuario.
// ============================================================

const carritoServicio = require('../services/carrito.servicio');
const { obtenerIdValido, estadoDeError, errorInterno } = require('../utils/respuestas');

// GET /carrito
const obtener = async (req, res) => {
    try {
        const resultado = await carritoServicio.obtener(req.usuario.id_usuario);

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(200).json(resultado);
    } catch (error) {
        return errorInterno(res, 'Error al obtener el carrito',
            'No se pudo obtener el carrito', error);
    }
};

// POST /carrito  { variante_id, cantidad }
const agregar = async (req, res) => {
    try {
        const { variante_id, cantidad } = req.body || {};

        const resultado = await carritoServicio.agregar(req.usuario.id_usuario, {
            variante_id: Number(variante_id),
            cantidad: cantidad === undefined ? 1 : Number(cantidad)
        });

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(201).json(resultado);
    } catch (error) {
        return errorInterno(res, 'Error al agregar al carrito',
            'No se pudo agregar el producto al carrito', error);
    }
};

// PATCH /carrito/:id  { cantidad }
const actualizar = async (req, res) => {
    try {
        const id = obtenerIdValido(req.params.id);
        if (!id) return res.status(400).json({ error: 'ID no válido' });

        const { cantidad } = req.body || {};

        const resultado = await carritoServicio.actualizar(
            req.usuario.id_usuario,
            id,
            Number(cantidad)
        );

        if (resultado.noEncontrado) {
            return res.status(404).json({ error: 'El producto no está en tu carrito' });
        }

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(200).json(resultado);
    } catch (error) {
        return errorInterno(res, 'Error al actualizar el carrito',
            'No se pudo actualizar el carrito', error);
    }
};

// DELETE /carrito/:id
const eliminar = async (req, res) => {
    try {
        const id = obtenerIdValido(req.params.id);
        if (!id) return res.status(400).json({ error: 'ID no válido' });

        const resultado = await carritoServicio.eliminar(req.usuario.id_usuario, id);

        if (resultado.noEncontrado) {
            return res.status(404).json({ error: 'El producto no está en tu carrito' });
        }

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(200).json(resultado);
    } catch (error) {
        return errorInterno(res, 'Error al eliminar del carrito',
            'No se pudo eliminar el producto del carrito', error);
    }
};

// DELETE /carrito
const vaciar = async (req, res) => {
    try {
        const resultado = await carritoServicio.vaciar(req.usuario.id_usuario);

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(200).json(resultado);
    } catch (error) {
        return errorInterno(res, 'Error al vaciar el carrito',
            'No se pudo vaciar el carrito', error);
    }
};

// POST /carrito/confirmar
const confirmar = async (req, res) => {
    try {
        const resultado = await carritoServicio.confirmar(req.usuario.id_usuario);

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(201).json(resultado);
    } catch (error) {
        return errorInterno(res, 'Error al confirmar el pedido',
            'No se pudo confirmar el pedido', error);
    }
};

// GET /carrito/pedidos
const historial = async (req, res) => {
    try {
        const resultado = await carritoServicio.historial(req.usuario.id_usuario);

        if (resultado.error) {
            return res.status(estadoDeError(resultado)).json({ error: resultado.error });
        }

        return res.status(200).json(resultado);
    } catch (error) {
        return errorInterno(res, 'Error al obtener los pedidos',
            'No se pudieron obtener los pedidos', error);
    }
};

module.exports = {
    obtener,
    agregar,
    actualizar,
    eliminar,
    vaciar,
    confirmar,
    historial
};
