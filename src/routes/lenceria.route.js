const express = require('express');
const router = express.Router();

const lenceriaControl = require('../controller/lenceria.control');

router.get('/', lenceriaControl.obtenerTodos);
router.get('/:id', lenceriaControl.buscarPorId);

router.post('/', lenceriaControl.crear);

router.put('/:id', lenceriaControl.actualizar);
router.patch('/:id', lenceriaControl.actualizar);

router.delete('/:id', lenceriaControl.eliminar);

module.exports = router;