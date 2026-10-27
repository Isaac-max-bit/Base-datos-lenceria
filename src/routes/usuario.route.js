
const express = require('express');
const router = express.Router();

const usuarioControl = require('../controller/usuario.control');

// Validar que el ID sea un entero positivo
const validarId = (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'El ID debe ser un número entero positivo'
        });
    }

    next();
};

// Validar que el cuerpo de la petición sea un objeto JSON
const validarBody = (req, res, next) => {
    if (
        !req.body ||
        typeof req.body !== 'object' ||
        Array.isArray(req.body) ||
        Object.keys(req.body).length === 0
    ) {
        return res.status(400).json({
            error: 'Debes enviar un objeto JSON con los datos del usuario'
        });
    }

    next();
};

// ==========================================
// RUTAS DE CONSULTA
// ==========================================

// GET /usuarios
// Obtener todos los usuarios
router.get('/', usuarioControl.obtenerTodos);

// GET /usuarios/buscar?nombre=Isaac
// Buscar usuarios por nombre
router.get('/buscar', usuarioControl.buscarPorNombre);

// GET /usuarios/:id
// Obtener un usuario por ID
router.get('/:id', validarId, usuarioControl.buscarPorId);

// ==========================================
// RUTA DE CREACIÓN
// ==========================================

// POST /usuarios
router.post(
    '/',
    validarBody,
    usuarioControl.crear
);

// ==========================================
// RUTAS DE ACTUALIZACIÓN
// ==========================================

// PUT /usuarios/:id
// Actualizar el usuario completo
router.put(
    '/:id',
    validarId,
    validarBody,
    usuarioControl.actualizarCompleto
);

// PATCH /usuarios/:id
// Actualizar parcialmente el usuario
router.patch(
    '/:id',
    validarId,
    validarBody,
    usuarioControl.actualizarParcial
);

// ==========================================
// RUTA DE ELIMINACIÓN
// ==========================================

// DELETE /usuarios/:id
router.delete(
    '/:id',
    validarId,
    usuarioControl.eliminar
);

module.exports = router;
