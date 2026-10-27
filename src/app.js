
require('dotenv').config();

const express = require('express');
const app = express();

const usuarioRoute = require('./routes/usuario.route');
const lenceriaRoute = require('./routes/lenceria.route');

const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARES
// ==========================================

// Procesar solicitudes con JSON
app.use(express.json());

// ==========================================
// RUTA PRINCIPAL
// ==========================================

app.get('/', (req, res) => {
    res.status(200).json({
        mensaje: 'Backend de lencería funcionando',
        estado: 'activo',
        rutas: {
            usuarios: '/usuarios',
            productos: '/productos'
        }
    });
});

// ==========================================
// RUTAS DE LA API
// ==========================================

app.use('/usuarios', usuarioRoute);
app.use('/productos', lenceriaRoute);

// ==========================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ==========================================

app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        ruta: req.originalUrl,
        metodo: req.method
    });
});

// ==========================================
// MANEJO CENTRALIZADO DE ERRORES
// ==========================================

app.use((err, req, res, next) => {
    console.error('Error en el servidor:', err.message);

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'El JSON enviado no es válido'
        });
    }

    return res.status(500).json({
        error: 'Error interno del servidor'
    });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

module.exports = app;
