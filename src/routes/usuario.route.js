const express = require("express");
const router = express.Router();

// Importamos el controlador (asegúrate de que la ruta del archivo sea correcta)
const usuarioControlador = require("../controller/usuario.control");

// GET /api/usuarios - Obtener todos los usuarios
router.get("/", usuarioControlador.obtenerTodos);

// GET /api/usuarios/buscar?nombre=... - Buscar por nombre (Debe ir antes de /:id para que Express no confunda "buscar" con un ID)
router.get("/buscar", usuarioControlador.buscarPorNombre);

// GET /api/usuarios/:id - Buscar usuario por ID
router.get("/:id", usuarioControlador.buscarPorId);

// POST /api/usuarios - Crear un usuario
router.post("/", usuarioControlador.crear);

// PUT /api/usuarios/:id - Actualización completa
router.put("/:id", usuarioControlador.actualizarCompleto);

// PATCH /api/usuarios/:id - Actualización parcial
router.patch("/:id", usuarioControlador.actualizarParcial);

// DELETE /api/usuarios/:id - Eliminar usuario
router.delete("/:id", usuarioControlador.eliminar);

module.exports = router;