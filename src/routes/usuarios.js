const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");

// GET /api/usuarios - Consultar usuarios
router.get("/", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("Usuario")
            .select("*");

        if (error) {
            console.error("Error de Supabase:", error.message);
            return res.status(500).json({
                error: "No se pudieron consultar los usuarios"
            });
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

// POST /api/usuarios - Registrar usuario
router.post("/", async (req, res) => {
    try {
        const usuario = req.body;

        if (!usuario || Object.keys(usuario).length === 0) {
            return res.status(400).json({
                error: "Debes enviar los datos del usuario"
            });
        }

        const { data, error } = await supabase
            .from("Usuario")
            .insert(usuario)
            .select();

        if (error) {
            console.error("Error de Supabase:", error.message);
            return res.status(400).json({
                error: "No se pudo registrar el usuario"
            });
        }

        return res.status(201).json(data[0]);
    } catch (error) {
        return res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

module.exports = router;