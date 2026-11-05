const express = require('express');
const router = express.Router();

const lenceriaControl = require('../controller/lenceria.control');

const validarId = (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'El ID debe ser un número entero positivo'
        });
    }

    next();
};

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

router.get('/', lenceriaControl.obtenerTodos);
router.get('/:id', validarId, lenceriaControl.buscarPorId);
router.post('/', validarBody, lenceriaControl.crear);
router.put('/:id', validarId, validarBody, lenceriaControl.actualizarCompleto);
router.patch('/:id', validarId, validarBody, lenceriaControl.actualizarParcial);
router.delete('/:id', validarId, lenceriaControl.eliminar);

module.exports = router;