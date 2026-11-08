/**
 * @file lenceria.route.js
 * @description Rutas para la gestión de productos de lencería.
 */

const express = require('express');
const router = express.Router();

// Importación del controlador
const lenceriaControlador = require("../controller/lenceria.control");

/**
 * Middleware: Valida que el parámetro ID sea un número entero positivo.
 */
const validarId = (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'El ID debe ser un número entero positivo'
        });
    }

    next();
};

/**
 * Middleware: Valida que el cuerpo de la petición (body) sea un objeto JSON válido y no esté vacío.
 */
const validarBody = (req, res, next) => {
    if (
        !req.body ||
        typeof req.body !== 'object' ||
        Array.isArray(req.body) ||
        Object.keys(req.body).length === 0
    ) {
        return res.status(400).json({
            error: 'Debes enviar un objeto JSON con los datos del producto'
        });
    }

    next();
};

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