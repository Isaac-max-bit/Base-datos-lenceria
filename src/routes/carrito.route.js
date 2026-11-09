const express = require('express');
const router = express.Router();

const carritoControlador = require('../controller/carrito.control');
const { validarId, validarBody } = require('../middlewares/validar');
const { autenticar } = require('../middlewares/auth');

// Montado en app.js como /carrito
// Todas las rutas exigen sesión.

// GET /carrito - Carrito del usuario autenticado.
router.get('/', autenticar, carritoControlador.obtener);

// GET /carrito/pedidos - Historial de pedidos del usuario.
router.get('/pedidos', autenticar, carritoControlador.historial);

// POST /carrito/confirmar - Convierte el carrito en pedido.
router.post('/confirmar', autenticar, carritoControlador.confirmar);

// POST /carrito - Agregar una variante.
router.post('/', autenticar, validarBody, carritoControlador.agregar);

// PATCH /carrito/:id - Cambiar la cantidad.
router.patch('/:id', autenticar, validarId, validarBody, carritoControlador.actualizar);

// DELETE /carrito/:id - Quitar un producto.
router.delete('/:id', autenticar, validarId, carritoControlador.eliminar);

// DELETE /carrito - Vaciar el carrito.
router.delete('/', autenticar, carritoControlador.vaciar);

module.exports = router;
