require("dotenv").config();

const express = require("express");
const app = express();

app.use(express.json());

const usuariosRoutes = require("./routes/usuarios");

app.get("/", (req, res) => {
    res.json({ mensaje: "Backend de lencería funcionando" });
});

app.use("/api/usuarios", usuariosRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});