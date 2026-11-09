/**
 * @file lenceria.route.js
 * @description Rutas para la gestión de productos de lencería.
 */

const express = require('express');
const router = express.Router();

// Importación del controlador
const lenceriaControlador = require("../controller/lenceria.control");

const { validarId, validarBody } = require('../middlewares/validar');
const { subirImagenes } = require('../middlewares/imagenes');
const { autenticar, requiereRol } = require('../middlewares/auth');

// Solo vendedores y administradores pueden crear, editar o borrar productos
// y subir imágenes.
const gestionarProductos = [autenticar, requiereRol('admin', 'vendedor')];

// ==========================================
// RUTAS DE LENCERÍA
// ==========================================

// Obtener todos los productos (público)
router.get('/', lenceriaControlador.obtenerTodos);

// Buscar productos por nombre. Debe ir ANTES de /:id para que
// Express no interprete "buscar" como un ID.
router.get('/buscar', lenceriaControlador.buscarPorTexto);

// Buscar un producto por su ID (público)
router.get('/:id', validarId, lenceriaControlador.buscarPorId);

// Crear un nuevo producto (admin o vendedor)
router.post('/', gestionarProductos, validarBody, lenceriaControlador.crear);

// Subir una o varias imágenes de un producto (admin o vendedor)
router.post(
    '/:id/imagenes',
    gestionarProductos,
    validarId,
    subirImagenes,
    lenceriaControlador.subirImagenes
);

// Actualizar un producto de forma completa (admin o vendedor)
router.put(
    '/:id',
    gestionarProductos,
    validarId,
    validarBody,
    lenceriaControlador.actualizarCompleto
);

// Actualizar un producto de forma parcial (admin o vendedor)
router.patch(
    '/:id',
    gestionarProductos,
    validarId,
    validarBody,
    lenceriaControlador.actualizarParcial
);

// Eliminar un producto (admin o vendedor)
router.delete(
    '/:id',
    gestionarProductos,
    validarId,
    lenceriaControlador.eliminar
);

module.exports = router;
