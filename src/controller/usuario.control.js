// ============================================================
// CONTROLADOR DE USUARIOS
// Recibe la petición HTTP, valida el ID, llama al servicio y
// responde con el código de estado correcto:
//   200 OK · 201 Creado · 400 Datos inválidos
//   404 No encontrado · 409 Conflicto · 500 Error del servidor
// ============================================================
 
const usuarioServicio = require('../services/usuario.servicio');
 
// ------------------------------------------------------------
// FUNCIONES AUXILIARES
// ------------------------------------------------------------
 
// Convierte el ID de la URL en número. Devuelve null si no es
// un entero positivo.
const obtenerIdValido = (valor) => {
    const id = Number(valor);
 
    return Number.isInteger(id) && id > 0 ? id : null;
};
 
// Estado HTTP para un error controlado del servicio:
// 'conflicto' (correo repetido, usuario en uso) -> 409, el resto -> 400
const estadoDeError = (resultado) =>
    resultado.tipo === 'conflicto' ? 409 : 400;
 
// Respuesta estándar para errores inesperados (caídas de Supabase, etc.)
// El detalle técnico solo se escribe en consola, no se envía al cliente.
const errorInterno = (res, contexto, mensajePublico, error) => {
    console.error(`${contexto}:`, error.message);
 
    return res.status(500).json({ error: mensajePublico });
};
 
// ------------------------------------------------------------
// GET /usuarios
// ------------------------------------------------------------
const obtenerTodos = async (req, res) => {
    try {
        const usuarios = await usuarioServicio.obtenerTodos();
 
        return res.status(200).json(usuarios);
    } catch (error) {
        return errorInterno(
            res,
            'Error al obtener usuarios',
            'No se pudieron obtener los usuarios',
            error
        );
    }
};
 
// ------------------------------------------------------------
// GET /usuarios/:id
// ------------------------------------------------------------
const buscarPorId = async (req, res) => {
    try {
        const id = obtenerIdValido(req.params.id);
 
        if (!id) {
            return res.status(400).json({ error: 'ID no válido' });
        }
 
        const usuario = await usuarioServicio.buscarPorId(id);
 
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
 
        return res.status(200).json(usuario);
    } catch (error) {
        return errorInterno(
            res,
            'Error al buscar usuario',
            'No se pudo buscar el usuario',
            error
        );
    }
};
 
// ------------------------------------------------------------
// GET /usuarios/buscar?nombre=Isaac
// ------------------------------------------------------------
const buscarPorNombre = async (req, res) => {
    try {
        const nombre = req.query.nombre;
 
        if (typeof nombre !== 'string' || !nombre.trim()) {
            return res.status(400).json({ error: 'Debes indicar un nombre' });
        }
 
        const usuarios = await usuarioServicio.buscarPorNombre(nombre.trim());
 
        return res.status(200).json(usuarios);
    } catch (error) {
        return errorInterno(
            res,
            'Error al buscar por nombre',
            'No se pudo realizar la búsqueda',
            error
        );
    }
};
 
// ------------------------------------------------------------
// POST /usuarios
// ------------------------------------------------------------
const crear = async (req, res) => {
    try {
        const resultado = await usuarioServicio.crear(req.body);
 
        if (resultado.error) {
            return res
                .status(estadoDeError(resultado))
                .json({ error: resultado.error });
        }
 
        return res.status(201).json(resultado.usuario);
    } catch (error) {
        return errorInterno(
            res,
            'Error al crear usuario',
            'No se pudo crear el usuario',
            error
        );
    }
};
 
// ------------------------------------------------------------
// PUT /usuarios/:id  (reemplazo completo: nombre y email obligatorios)
// ------------------------------------------------------------
const actualizarCompleto = async (req, res) => {
    try {
        const id = obtenerIdValido(req.params.id);
 
        if (!id) {
            return res.status(400).json({ error: 'ID no válido' });
        }
 
        const resultado = await usuarioServicio.actualizar(id, req.body, false);
 
        if (!resultado) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
 
        if (resultado.error) {
            return res
                .status(estadoDeError(resultado))
                .json({ error: resultado.error });
        }
 
        return res.status(200).json(resultado.usuario);
    } catch (error) {
        return errorInterno(
            res,
            'Error al actualizar usuario (PUT)',
            'No se pudo actualizar el usuario',
            error
        );
    }
};
 
// ------------------------------------------------------------
// PATCH /usuarios/:id  (solo cambia los campos enviados)
// ------------------------------------------------------------
const actualizarParcial = async (req, res) => {
    try {
        const id = obtenerIdValido(req.params.id);
 
        if (!id) {
            return res.status(400).json({ error: 'ID no válido' });
        }
 
        const resultado = await usuarioServicio.actualizar(id, req.body, true);
 
        if (!resultado) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
 
        if (resultado.error) {
            return res
                .status(estadoDeError(resultado))
                .json({ error: resultado.error });
        }
 
        return res.status(200).json(resultado.usuario);
    } catch (error) {
        return errorInterno(
            res,
            'Error al actualizar usuario (PATCH)',
            'No se pudo actualizar el usuario',
            error
        );
    }
};
 
// ------------------------------------------------------------
// DELETE /usuarios/:id
// ------------------------------------------------------------
const eliminar = async (req, res) => {
    try {
        const id = obtenerIdValido(req.params.id);
 
        if (!id) {
            return res.status(400).json({ error: 'ID no válido' });
        }
 
        const resultado = await usuarioServicio.eliminar(id);
 
        if (!resultado) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
 
        if (resultado.error) {
            return res
                .status(estadoDeError(resultado))
                .json({ error: resultado.error });
        }
 
        return res.status(200).json({
            mensaje: 'Usuario eliminado correctamente'
        });
    } catch (error) {
        return errorInterno(
            res,
            'Error al eliminar usuario',
            'No se pudo eliminar el usuario',
            error
        );
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
 