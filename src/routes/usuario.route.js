const express = require('express');
const router = express.Router();

const usuarioControlador = require('../controller/usuario.control');
const { validarId, validarBody } = require('../middlewares/validar');

// Montado en app.js como /usuarios

// GET /usuarios - Obtener todos los usuarios
router.get('/', usuarioControlador.obtenerTodos);

// GET /usuarios/buscar?nombre=... - Debe ir ANTES de /:id, si no Express
// tomaría "buscar" como si fuera un ID.
router.get('/buscar', usuarioControlador.buscarPorNombre);

// GET /usuarios/:id - Buscar usuario por ID
router.get('/:id', validarId, usuarioControlador.buscarPorId);

// POST /usuarios - Crear un usuario
router.post('/', validarBody, usuarioControlador.crear);

// PUT /usuarios/:id - Actualización completa (nombre y email obligatorios)
router.put('/:id', validarId, validarBody, usuarioControlador.actualizarCompleto);

// PATCH /usuarios/:id - Actualización parcial
router.patch('/:id', validarId, validarBody, usuarioControlador.actualizarParcial);

// DELETE /usuarios/:id - Eliminar usuario
router.delete('/:id', validarId, usuarioControlador.eliminar);

module.exports = router;