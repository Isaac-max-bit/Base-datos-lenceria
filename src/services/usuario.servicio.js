
const usuarioServicio = require('../services/usuario.servicio');

// Obtener todos los usuarios
const obtenerTodos = async (req, res, next) => {
    try {
        const usuarios = await usuarioServicio.obtenerTodos();
        return res.status(200).json(usuarios);
    } catch (error) {
        next(error);
    }
};

// Buscar usuario por ID
const buscarPorId = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'ID no válido' });
        }

        const usuario = await usuarioServicio.buscarPorId(id);

        if (!usuario) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        return res.status(200).json(usuario);
    } catch (error) {
        next(error);
    }
};

// Buscar usuarios por nombre
const buscarPorNombre = async (req, res, next) => {
    try {
        const nombre = req.query.nombre;

        if (typeof nombre !== 'string' || !nombre.trim()) {
            return res.status(400).json({
                error: 'Debes indicar un nombre'
            });
        }

        const usuarios = await usuarioServicio.buscarPorNombre(nombre);

        return res.status(200).json(usuarios);
    } catch (error) {
        next(error);
    }
};

// Crear usuario
const crear = async (req, res, next) => {
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
        next(error);
    }
};

// Actualizar usuario completo (PUT)
const actualizarCompleto = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'ID no válido' });
        }

        const resultado = await usuarioServicio.actualizar(
            id,
            req.body,
            false
        );

        if (!resultado) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        if (resultado.error) {
            const estado = resultado.error === 'El correo ya está registrado'
                ? 409
                : 400;

            return res.status(estado).json({
                error: resultado.error
            });
        }

        return res.status(200).json(resultado.usuario);
    } catch (error) {
        next(error);
    }
};

// Actualizar usuario parcialmente (PATCH)
const actualizarParcial = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'ID no válido' });
        }

        const resultado = await usuarioServicio.actualizar(
            id,
            req.body,
            true
        );

        if (!resultado) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        if (resultado.error) {
            const estado = resultado.error === 'El correo ya está registrado'
                ? 409
                : 400;

            return res.status(estado).json({
                error: resultado.error
            });
        }

        return res.status(200).json(resultado.usuario);
    } catch (error) {
        next(error);
    }
};

// Eliminar usuario
const eliminar = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'ID no válido' });
        }

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
        next(error);
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
