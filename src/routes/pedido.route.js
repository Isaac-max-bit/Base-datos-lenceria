const express = require('express');
const router = express.Router();

const pedidoControlador = require('../controller/pedido.control');
const { validarBody } = require('../middlewares/validar');

// Montado en app.js como /pedidos

// POST /pedidos/invitado - Compra sin cuenta.
// No usa `autenticar`: el invitado no tiene token.
router.post('/invitado', validarBody, pedidoControlador.crearInvitado);

module.exports = router;
