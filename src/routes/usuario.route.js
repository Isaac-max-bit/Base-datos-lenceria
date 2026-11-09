const express = require("express");
const router = express.Router();

const usuarioControlador = require("../controller/usuario.control");
const { validarId, validarBody } = require("../middlewares/validar");
const {
  autenticar,
  requiereRol,
  esMismoUsuarioOAdmin,
} = require("../middlewares/auth");

// GET /usuarios/perfil
router.get("/perfil", autenticar, usuarioControlador.perfil);

// PATCH /usuarios/perfil
router.patch(
  "/perfil",
  autenticar,
  validarBody,
  usuarioControlador.actualizarPerfil,
);

// GET /usuarios
router.get(
  "/",
  autenticar,
  requiereRol("admin"),
  usuarioControlador.obtenerTodos,
);

// GET /usuarios/buscar
router.get(
  "/buscar",
  autenticar,
  requiereRol("admin"),
  usuarioControlador.buscarPorNombre,
);

// GET /usuarios/:id
router.get(
  "/:id",
  autenticar,
  validarId,
  esMismoUsuarioOAdmin,
  usuarioControlador.buscarPorId,
);

// POST /usuarios/login
router.post("/login", validarBody, usuarioControlador.login);

// POST /usuarios
router.post("/", validarBody, usuarioControlador.crear);

// PUT /usuarios/:id
router.put(
  "/:id",
  autenticar,
  validarId,
  esMismoUsuarioOAdmin,
  validarBody,
  usuarioControlador.actualizarCompleto,
);

// PATCH /usuarios/:id
router.patch(
  "/:id",
  autenticar,
  validarId,
  esMismoUsuarioOAdmin,
  validarBody,
  usuarioControlador.actualizarParcial,
);

// DELETE /usuarios/:id
router.delete(
  "/:id",
  autenticar,
  validarId,
  requiereRol("admin"),
  usuarioControlador.eliminar,
);

module.exports = router;
