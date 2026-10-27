
const usuarioServicio = require('../services/usuario.servicio');

const obtenerTodos = (req, res) => {
    res.json(usuarioServicio.obtenerTodos());
};

const buscarPorId = (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID no válido' });
    }

    const usuario = usuarioServicio.buscarPorId(id);

    if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario);
};

const buscarPorNombre = (req, res) => {
    const nombre = req.query.nombre;

    if (typeof nombre !== 'string' || !nombre.trim()) {
        return res.status(400).json({ error: 'Debes indicar un nombre' });
    }

    res.json(usuarioServicio.buscarPorNombre(nombre.trim()));
};

const crear = (req, res) => {
    const { nombre, email } = req.body;

    if (
        typeof nombre !== 'string' || !nombre.trim() ||
        typeof email !== 'string' || !email.trim()
    ) {
        return res.status(400).json({
            error: 'Nombre y email son obligatorios'
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ error: 'Email no válido' });
    }

    const resultado = usuarioServicio.crear({ nombre, email });

    if (resultado.error) {
        return res.status(409).json({ error: resultado.error });
    }

    res.status(201).json(resultado.usuario);
};

const actualizarCompleto = (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID no válido' });
    }

    const resultado = usuarioServicio.actualizar(id, req.body);

    if (!resultado) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (resultado.error) {
        return res.status(400).json({ error: resultado.error });
    }

    res.json(resultado.usuario);
};

const actualizarParcial = (req, res) => {
    const id = Number(req.params.id);
    const campos = Object.keys(req.body);
    const permitidos = ['nombre', 'email'];

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID no válido' });
    }

    if (
        campos.length === 0 ||
        campos.some(campo => !permitidos.includes(campo))
    ) {
        return res.status(400).json({
            error: 'Envía al menos nombre o email'
        });
    }

    const resultado = usuarioServicio.actualizar(
        id,
        req.body,
        true
    );

    if (!resultado) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (resultado.error) {
        return res.status(400).json({ error: resultado.error });
    }

    res.json(resultado.usuario);
};

const eliminar = (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID no válido' });
    }

    const eliminado = usuarioServicio.eliminar(id);

    if (!eliminado) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.status(200).json({ mensaje: 'Usuario eliminado correctamente' });
};

module.exports = {
    obtenerTodos,
    buscarPorId,
    buscarPorNombre,
    crear,
    actualizarCompleto,
    actualizarParcial,
    eliminar
};
