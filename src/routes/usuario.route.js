const express = require('express');
const router = express.Router();

// Importar el controlador correctamente
const usuarioControl = require('../controller/usuario.control');

// Rutas de usuarios
router.get('/', usuarioControl.obtenerTodos);
router.get('/buscar', usuarioControl.buscarPorNombre);
router.get('/:id', usuarioControl.buscarPorId);

router.post('/', usuarioControl.crear);

router.put('/:id', usuarioControl.actualizarCompleto);
router.patch('/:id', usuarioControl.actualizarParcial);

router.delete('/:id', usuarioControl.eliminar);

module.exports = router;