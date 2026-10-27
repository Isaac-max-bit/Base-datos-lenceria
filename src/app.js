
require('dotenv').config();

const express = require('express');
const app = express();

const usuarioRoute = require('./routes/usuario.route');
const lenceriaRoute = require('./routes/lenceria.route');

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        mensaje: 'Backend de lencería funcionando'
    });
});

app.use('/usuarios', usuarioRoute);
app.use('/productos', lenceriaRoute);

app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
