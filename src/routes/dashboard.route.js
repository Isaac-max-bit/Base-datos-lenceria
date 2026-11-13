const express = require("express");
const router = express.Router();

const dashboardControl = require("../controller/dashboard.control");

// Verificar que el módulo esté activo
router.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        mensaje: "Módulo de dashboard activo"
    });
});

// Obtener estadísticas
router.get("/resumen", dashboardControl.obtenerResumen);

module.exports = router;