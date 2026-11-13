
/**
 * ==========================================================
 * LENCERÍA LUXURY
 * ARCHIVO PRINCIPAL DEL BACKEND
 * ==========================================================
 *
 * Tecnologías:
 * - Node.js
 * - Express
 * - Supabase
 *
 * Arquitectura:
 * - Routes
 * - Controllers
 * - Services
 * - Middlewares
 * ==========================================================
 */


// ==========================================================
// 1. VARIABLES DE ENTORNO
// ==========================================================

// Cargar las variables del archivo .env
require("dotenv").config();


// ==========================================================
// 2. MANEJO DE PROMESAS RECHAZADAS
// ==========================================================

process.on("unhandledRejection", (reason, promise) => {

    console.error(
        "Promesa rechazada no manejada:",
        reason
    );

});


// ==========================================================
// 3. IMPORTACIONES
// ==========================================================

const express = require("express");

const app = express();

const usuarioRoute = require("./routes/usuario.route");

const lenceriaRoute = require("./routes/lenceria.route");

const carritoRoute = require("./routes/carrito.route");

const dashboardRoute = require("./routes/dashboard.route");


// ==========================================================
// 4. CONFIGURACIÓN DEL SERVIDOR
// ==========================================================

const PORT = process.env.PORT || 3000;


// ==========================================================
// 5. CONFIGURACIÓN DE CORS
// ==========================================================

// Orígenes autorizados para conectarse al backend.

const ORIGENES_PERMITIDOS = (
    process.env.CORS_ORIGIN ||
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
)
    .split(",")
    .map((origen) => origen.trim())
    .filter(Boolean);


// Permitir cualquier puerto de localhost únicamente
// cuando no se haya definido CORS_ORIGIN.

const esLocalhost = (origen) =>
    !process.env.CORS_ORIGIN &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen);


// ==========================================================
// 6. MIDDLEWARE DE CORS
// ==========================================================

app.use((req, res, next) => {

    const origen = req.headers.origin;

    if (
        origen &&
        (
            ORIGENES_PERMITIDOS.includes("*") ||
            ORIGENES_PERMITIDOS.includes(origen) ||
            esLocalhost(origen)
        )
    ) {

        res.setHeader(
            "Access-Control-Allow-Origin",
            origen
        );

        res.setHeader("Vary", "Origin");

        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        );

        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
        );

    }

    // Responder las solicitudes preliminares de CORS.

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();

});


// ==========================================================
// 7. MIDDLEWARES DE EXPRESS
// ==========================================================

// Procesar solicitudes con formato JSON.

app.use(express.json());


// ==========================================================
// 8. RUTA PRINCIPAL
// ==========================================================

app.get("/", (req, res) => {

    res.status(200).json({

        mensaje: "Backend de Lencería Luxury funcionando",

        estado: "activo",

        rutas: {

            usuarios: "/usuarios",

            login: "/usuarios/login",

            perfil: "/usuarios/perfil",

            productos: "/productos",

            busqueda: "/productos/buscar?q=...",

            subirImagen: "POST /productos/:id/imagenes",

            carrito: "/carrito",

            pedidos: "/carrito/pedidos",

            dashboard: "/api/dashboard"

        }

    });

});


// ==========================================================
// 9. RUTAS DE LA API
// ==========================================================

// USUARIOS
app.use(
    "/usuarios",
    usuarioRoute
);


// PRODUCTOS
app.use(
    "/productos",
    lenceriaRoute
);


// CARRITO Y PEDIDOS
app.use(
    "/carrito",
    carritoRoute
);


// DASHBOARD ADMINISTRATIVO
app.use(
    "/api/dashboard",
    dashboardRoute
);


// ==========================================================
// 10. MANEJO DE RUTAS NO ENCONTRADAS
// ==========================================================

app.use((req, res) => {

    res.status(404).json({

        error: "Ruta no encontrada",

        ruta: req.originalUrl,

        metodo: req.method

    });

});


// ==========================================================
// 11. MANEJO CENTRALIZADO DE ERRORES
// ==========================================================

app.use((err, req, res, next) => {

    console.error(
        "Error en el servidor:",
        err
    );


    // Error de sintaxis en JSON.

    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        "body" in err
    ) {

        return res.status(400).json({

            error: "El JSON enviado no es válido"

        });

    }


    // Error interno.

    return res.status(500).json({

        error: "Error interno del servidor"

    });

});


// ==========================================================
// 12. INICIAR SERVIDOR
// ==========================================================

// Permite importar app.js desde pruebas automatizadas
// sin iniciar automáticamente otro servidor.

if (require.main === module) {

    app.listen(PORT, () => {

        console.log("----------------------------------------");

        console.log("       LENCERÍA LUXURY");

        console.log("----------------------------------------");

        console.log(
            `Servidor iniciado en http://localhost:${PORT}`
        );

        console.log("Estado: ACTIVO");

        console.log("----------------------------------------");


        // Crear administrador automáticamente.

        const asegurarAdmin = require("./utils/crearAdminAuto");

        setTimeout(() => {

            Promise.resolve()
                .then(() => asegurarAdmin())
                .catch((error) => {

                    console.error(
                        "Error al asegurar administrador:",
                        error
                    );

                });

        }, 2000);

    });

}


// ==========================================================
// 13. EXPORTAR APLICACIÓN
// ==========================================================

module.exports = app;
