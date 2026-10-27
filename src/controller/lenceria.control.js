
const lenceriaServicio = require('../services/lenceria.servicio');

const obtenerTodos = (req, res) => {
    res.json(lenceriaServicio.obtenerTodos());
};

const buscarPorId = (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID no válido' });
    }

    const producto = lenceriaServicio.buscarPorId(id);

    if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(producto);
};

const crear = (req, res) => {
    const resultado = lenceriaServicio.crear(req.body);

    if (resultado.error) {
        return res.status(400).json({ error: resultado.error });
    }

    res.status(201).json(resultado.producto);
};

const actualizar = (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID no válido' });
    }

    const resultado = lenceriaServicio.actualizar(id, req.body);

    if (!resultado) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (resultado.error) {
        return res.status(400).json({ error: resultado.error });
    }

    res.json(resultado.producto);
};

const eliminar = (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID no válido' });
    }

    const eliminado = lenceriaServicio.eliminar(id);

    if (!eliminado) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto eliminado correctamente' });
};

module.exports = {
    obtenerTodos,
    buscarPorId,
    crear,
    actualizar,
    eliminar
};
