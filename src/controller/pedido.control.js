// ============================================================
// CONTROLADOR DE PEDIDOS
// POST /pedidos/invitado no exige sesión: el cliente solo envía
// sus datos de contacto, envío y los productos del carrito.
// ============================================================

const pedidoServicio = require('../services/pedidoInvitado.servicio');
const { estadoDeError, errorInterno } = require('../utils/respuestas');

// POST /pedidos/invitado
const crearInvitado = async (req, res) => {
    try {
        const resultado = await pedidoServicio.crear(req.body || {});

        if (resultado.error) {
            return res
                .status(estadoDeError(resultado))
                .json({ error: resultado.error });
        }

        return res.status(201).json(resultado);
    } catch (error) {
        // Los errores de validación/stock se lanzan con `publico` para
        // responder un mensaje claro sin exponer detalles internos.
        if (error.publico) {
            return res
                .status(estadoDeError(error))
                .json({ error: error.publico });
        }

        return errorInterno(
            res,
            'Error al registrar el pedido de invitado',
            'No se pudo registrar el pedido',
            error
        );
    }
};

module.exports = { crearInvitado };
