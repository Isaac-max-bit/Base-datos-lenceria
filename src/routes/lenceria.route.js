/**
 * @file lenceria.route.js
 * @description Rutas para la gestión de productos de lencería.
 */

const express = require('express');
const router = express.Router();

// Importación del controlador
const lenceriaControlador = require("../controller/lenceria.control");

const { validarId, validarBody } = require('../middlewares/validar');

// ==========================================
// RUTAS DE LENCERÍA
// ==========================================

// Obtener todos los productos
router.get('/', lenceriaControlador.obtenerTodos);

// Buscar un producto por su ID
router.get('/:id', validarId, lenceriaControlador.buscarPorId);

// Crear un nuevo producto
router.post('/', validarBody, lenceriaControlador.crear);

// Actualizar un producto de forma completa
router.put('/:id', validarId, validarBody, lenceriaControlador.actualizarCompleto);

// Actualizar un producto de forma parcial
router.patch('/:id', validarId, validarBody, lenceriaControlador.actualizarParcial);

// Eliminar un producto
router.delete('/:id', validarId, lenceriaControlador.eliminar);

module.exports = router;