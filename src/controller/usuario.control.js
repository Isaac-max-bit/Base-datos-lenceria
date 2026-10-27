
const usuarioServicio = require('../services/usuario.servicio');

// GET /usuarios
const obtenerTodos = async (req, res) => {
    try {
        const usuarios = await usuarioServicio.obtenerTodos();
        return res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error al obtener usuarios:', error.message);
        return res.status(500).json({
            error: 'No se pudieron consultar los usuarios'
        });
    }
};

// GET /usuarios/:id
const buscarPorId = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID no válido' });
    }

    try {
        const usuario = await usuarioServicio.buscarPorId(id);

        if (!usuario) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        return res.status(200).json(usuario);
    } catch (error) {
        console.error('Error al buscar usuario:', error.message);
        return res.status(500).json({
            error: 'No se pudo consultar el usuario'
        });
    }
};

// GET /usuarios/buscar?nombre=Isaac
const buscarPorNombre = async (req, res) => {
    const nombre = req.query.nombre;

    if (typeof nombre !== 'string' || !nombre.trim()) {
        return res.status(400).json({
            error: 'Debes indicar un nombre'
        });
    }

    try {
        const usuarios = await usuarioServicio.buscarPorNombre(
            nombre.trim()
        );

        return res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error al buscar por nombre:', error.message);
        return res.status(500).json({
            error: 'No se pudieron buscar los usuarios'
        });
    }
};

// POST /usuarios
const crear = async (req, res) => {
    const { nombre, email } = req.body || {};

    if (
        typeof nombre !== 'string' || !nombre.trim() ||
        typeof email !== 'string' || !email.trim()
    ) {
        return res.status(400).json({
            error: 'Nombre y email son obligatorios'
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({
            error: 'Email no válido'
        });
    }

    try {
        const resultado = await usuarioServicio.crear(req.body);

        if (resultado.error) {
            const estado = resultado.error === 'El correo ya está registrado'
                ? 409
                : 400;

            return res.status(estado).json({
                error: resultado.error
            });
        }

        return res.status(201).json(resultado.usuario);
    } catch (error) {
        console.error('Error al crear usuario:', error.message);
        return res.status(500).json({
            error: 'No se pudo registrar el usuario'
        });
    }
};

// PUT /usuarios/:id
const actualizarCompleto = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID no válido' });
    }

    try {
        const resultado = await usuarioServicio.actualizar(
            id,
            req.body || {}
        );

        if (!resultado) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        if (resultado.error) {
            return res.status(400).json({
                error: resultado.error
            });
        }

        return res.status(200).json(resultado.usuario);
    } catch (error) {
        console.error('Error al actualizar usuario:', error.message);
        return res.status(500).json({
            error: 'No se pudo actualizar el usuario'
        });
    }
};

// PATCH /usuarios/:id
const actualizarParcial = async (req, res) => {
    const id = Number(req.params.id);
    const datos = req.body || {};
    const campos = Object.keys(datos);
    const permitidos = [
        'nombre',
        'email',
        'telefono',
        'direccion',
        'id_rol'
    ];

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID no válido' });
    }

    if (
        campos.length === 0 ||
        campos.some(campo => !permitidos.includes(campo))
    ) {
        return res.status(400).json({
            error: 'Envía al menos un campo válido para actualizar'
        });
    }

    try {
        const resultado = await usuarioServicio.actualizar(
            id,
            datos,
            true
        );

        if (!resultado) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        if (resultado.error) {
            return res.status(400).json({
                error: resultado.error
            });
        }

        return res.status(200).json(resultado.usuario);
    } catch (error) {
        console.error('Error al actualizar usuario:', error.message);
        return res.status(500).json({
            error: 'No se pudo actualizar el usuario'
        });
    }
};

// DELETE /usuarios/:id
const eliminar = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID no válido' });
    }

    try {
        const eliminado = await usuarioServicio.eliminar(id);

        if (!eliminado) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        return res.status(200).json({
            mensaje: 'Usuario eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error.message);
        return res.status(500).json({
            error: 'No se pudo eliminar el usuario'
        });
    }
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
