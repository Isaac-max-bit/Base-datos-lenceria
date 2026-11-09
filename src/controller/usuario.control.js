// ============================================================
// CONTROLADOR DE USUARIOS
// Recibe la petición HTTP, valida el ID, llama al servicio y
// responde con el código de estado correcto:
//   200 OK · 201 Creado · 400 Datos inválidos
//   404 No encontrado · 409 Conflicto · 500 Error del servidor
// ============================================================

const usuarioServicio = require("../services/usuario.servicio");
const { firmarToken } = require("../utils/token");
const {
  obtenerIdValido,
  estadoDeError,
  errorInterno,
} = require("../utils/respuestas");

// GET /usuarios
const obtenerTodos = async (req, res) => {
  try {
    const usuarios = await usuarioServicio.obtenerTodos();

    return res.status(200).json(usuarios);
  } catch (error) {
    return errorInterno(
      res,
      "Error al obtener usuarios",
      "No se pudieron obtener los usuarios",
      error,
    );
  }
};

// GET /usuarios/:id
const buscarPorId = async (req, res) => {
  try {
    const id = obtenerIdValido(req.params.id);
    if (!id) return res.status(400).json({ error: "ID no válido" });

    const usuario = await usuarioServicio.buscarPorId(id);
    if (!usuario)
      return res.status(404).json({ error: "Usuario no encontrado" });

    return res.status(200).json(usuario);
  } catch (error) {
    return errorInterno(
      res,
      "Error al buscar usuario",
      "No se pudo buscar el usuario",
      error,
    );
  }
};

// GET /usuarios/buscar?nombre=Isaac
const buscarPorNombre = async (req, res) => {
  try {
    const nombre = req.query.nombre;

    if (typeof nombre !== "string" || !nombre.trim()) {
      return res.status(400).json({ error: "Debes indicar un nombre" });
    }

    const usuarios = await usuarioServicio.buscarPorNombre(nombre.trim());

    return res.status(200).json(usuarios);
  } catch (error) {
    return errorInterno(
      res,
      "Error al buscar por nombre",
      "No se pudo realizar la búsqueda",
      error,
    );
  }
};

// POST /usuarios/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    const resultado = await usuarioServicio.autenticar(email, password);

    if (resultado.error) {
      return res
        .status(estadoDeError(resultado))
        .json({ error: resultado.error });
    }

    return res.status(200).json({
      usuario: resultado.usuario,
      token: firmarToken(resultado.usuario),
    });
  } catch (error) {
    return errorInterno(
      res,
      "Error al iniciar sesión",
      "No se pudo iniciar sesión",
      error,
    );
  }
};

// POST /usuarios
const crear = async (req, res) => {
  try {
    const resultado = await usuarioServicio.crear(req.body);

    if (resultado.error) {
      return res
        .status(estadoDeError(resultado))
        .json({ error: resultado.error });
    }

    return res.status(201).json({
      usuario: resultado.usuario,
      token: firmarToken(resultado.usuario),
    });
  } catch (error) {
    return errorInterno(
      res,
      "Error al crear usuario",
      "No se pudo crear el usuario",
      error,
    );
  }
};

// GET /usuarios/perfil — datos de la cuenta autenticada.
const perfil = (req, res) => res.status(200).json(req.usuario);

// PATCH /usuarios/perfil — el usuario edita su propia cuenta.
const actualizarPerfil = async (req, res) => {
  try {
    const resultado = await usuarioServicio.actualizar(
      req.usuario.id_usuario,
      req.body,
      true,
    );

    if (resultado.error) {
      return res
        .status(estadoDeError(resultado))
        .json({ error: resultado.error });
    }

    return res.status(200).json(resultado.usuario);
  } catch (error) {
    return errorInterno(
      res,
      "Error al actualizar el perfil",
      "No se pudo actualizar el perfil",
      error,
    );
  }
};

// Fábrica para PUT (reemplazo completo) y PATCH (solo lo enviado)
const crearActualizador = (parcial) => async (req, res) => {
  try {
    const id = obtenerIdValido(req.params.id);
    if (!id) return res.status(400).json({ error: "ID no válido" });

    const resultado = await usuarioServicio.actualizar(id, req.body, parcial);

    if (!resultado)
      return res.status(404).json({ error: "Usuario no encontrado" });

    if (resultado.error) {
      return res
        .status(estadoDeError(resultado))
        .json({ error: resultado.error });
    }

    return res.status(200).json(resultado.usuario);
  } catch (error) {
    return errorInterno(
      res,
      `Error al actualizar usuario (${parcial ? "PATCH" : "PUT"})`,
      "No se pudo actualizar el usuario",
      error,
    );
  }
};

const actualizarCompleto = crearActualizador(false);
const actualizarParcial = crearActualizador(true);

// DELETE /usuarios/:id
const eliminar = async (req, res) => {
  try {
    const id = obtenerIdValido(req.params.id);
    if (!id) return res.status(400).json({ error: "ID no válido" });

    const resultado = await usuarioServicio.eliminar(id);

    if (!resultado)
      return res.status(404).json({ error: "Usuario no encontrado" });

    if (resultado.error) {
      return res
        .status(estadoDeError(resultado))
        .json({ error: resultado.error });
    }

    return res.status(200).json({ mensaje: "Usuario eliminado correctamente" });
  } catch (error) {
    return errorInterno(
      res,
      "Error al eliminar usuario",
      "No se pudo eliminar el usuario",
      error,
    );
  }
};

module.exports = {
  obtenerTodos,
  buscarPorId,
  buscarPorNombre,
  login,
  crear,
  perfil,
  actualizarPerfil,
  actualizarCompleto,
  actualizarParcial,
  eliminar,
};
