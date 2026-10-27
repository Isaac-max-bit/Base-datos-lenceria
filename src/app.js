
const express = require('express');
const app = express();
const port = 3000;

const usuarioRoute = require('./routes/usuario.route');
const lenceriaRoute = require('./routes/lenceria.route');

app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
    res.send('SERVIDOR LENCERIA ENSAYO');
});

// Rutas de la API
app.use('/usuarios', usuarioRoute);
app.use('/productos', lenceriaRoute);

// Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada'
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'El JSON enviado no es válido'
        });
    }

    console.error(err);
    res.status(500).json({
        error: 'Error interno del servidor'
    });
});

app.listen(port, () => {
    console.log(`Servidor iniciado en http://localhost:${port}`);
});
