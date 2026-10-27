
const usuarioServicio = require('../services/usuario.servicio');

// Obtener todos los usuarios
const obtenerTodos = async (req, res) => {
    try {
        const usuarios = await usuarioServicio.obtenerTodos();
        return res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error al obtener usuarios:', error.message);
        return res.status(500).json({
            error: 'No se pudieron obtener los usuarios'
        });
    }
};

// Buscar usuario por ID
const buscarPorId = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID no válido'
            });
        }

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
            error: 'No se pudo buscar el usuario'
        });
    }
};

// Buscar usuarios por nombre
const buscarPorNombre = async (req, res) => {
    try {
        const nombre = req.query.nombre;

        if (typeof nombre !== 'string' || !nombre.trim()) {
            return res.status(400).json({
                error: 'Debes indicar un nombre'
            });
        }

        const usuarios = await usuarioServicio.buscarPorNombre(
            nombre.trim()
        );

        return res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error al buscar por nombre:', error.message);
        return res.status(500).json({
            error: 'No se pudo realizar la búsqueda'
        });
    }
};

// Crear usuario
const crear = async (req, res) => {
    try {
        const resultado = await usuarioServicio.crear(req.body);

        if (resultado.error) {
            const estado = resultado.error.includes('ya está registrado')
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
            error: 'No se pudo crear el usuario'
        });
    }
};

// Actualizar usuario completo (PUT)
const actualizarCompleto = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID no válido'
            });
        }

        const resultado = await usuarioServicio.actualizar(
            id,
            req.body
        );

        if (!resultado) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        if (resultado.error) {
            const estado = resultado.error.includes('ya está registrado')
                ? 409
                : 400;

            return res.status(estado).json({
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

// Actualizar usuario parcialmente (PATCH)
const actualizarParcial = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID no válido'
            });
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
            const estado = resultado.error.includes('ya está registrado')
                ? 409
                : 400;

            return res.status(estado).json({
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

// Eliminar usuario
const eliminar = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID no válido'
            });
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
