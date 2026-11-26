/**
 * @file categoria.route.js
 * @description Rutas para la gestión de categorías (TipoProducto).
 * Montadas en app.js como /categorias.
 */

const express = require('express');
const router = express.Router();

const categoriaControlador = require('../controller/categoria.control');

const { validarId, validarBody } = require('../middlewares/validar');
const { autenticar, requiereRol } = require('../middlewares/auth');

// Consultar categorías: administradores y vendedores.
// Crear, renombrar y eliminar: solo administradores.
router.use(autenticar);

router.get(
    '/',
    requiereRol('admin', 'vendedor'),
    categoriaControlador.obtenerTodas
);

router.post(
    '/',
    requiereRol('admin'),
    validarBody,
    categoriaControlador.crear
);

router.patch(
    '/:id',
    requiereRol('admin'),
    validarId,
    validarBody,
    categoriaControlador.actualizar
);

router.delete(
    '/:id',
    requiereRol('admin'),
    validarId,
    categoriaControlador.eliminar
);

module.exports = router;
