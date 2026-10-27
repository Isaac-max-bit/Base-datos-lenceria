require("dotenv").config();

import express, { json } from "express";
const app = express();

app.use(json());

import usuariosRoutes from "./routes/usuarios";

app.get("/", (req, res) => {
    res.json({ mensaje: "Backend de lencería funcionando" });
});

app.use("/api/usuarios", usuariosRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});