require("dotenv").config();

process.on("unhandledRejection", (reason, promise) => {
  console.error("Promesa rechazada no manejada:", reason);
});

const express = require("express");
const app = express();

const usuarioRoute = require("./routes/usuario.route");
const lenceriaRoute = require("./routes/lenceria.route");
const carritoRoute = require("./routes/carrito.route");

const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARES
// ==========================================

const ORIGENES_PERMITIDOS = (
  process.env.CORS_ORIGIN ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
)
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

const esLocalhost = (origen) =>
  !process.env.CORS_ORIGIN &&
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen);

app.use((req, res, next) => {
  const origen = req.headers.origin;

  if (
    origen &&
    (ORIGENES_PERMITIDOS.includes("*") ||
      ORIGENES_PERMITIDOS.includes(origen) ||
      esLocalhost(origen))
  ) {
    res.setHeader("Access-Control-Allow-Origin", origen);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

// ==========================================
// RUTA PRINCIPAL
// ==========================================

app.get("/", (req, res) => {
  res.status(200).json({
    mensaje: "Backend de lencería funcionando",
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
    },
  });
});

// ==========================================
// RUTAS DE LA API
// ==========================================

app.use("/usuarios", usuarioRoute);
app.use("/productos", lenceriaRoute);
app.use("/carrito", carritoRoute);

// ==========================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    ruta: req.originalUrl,
    metodo: req.method,
  });
});

// ==========================================
// MANEJO CENTRALIZADO DE ERRORES
// ==========================================

app.use((err, req, res, next) => {
  console.error("Error en el servidor:", err.message);

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "El JSON enviado no es válido",
    });
  }

  return res.status(500).json({
    error: "Error interno del servidor",
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);

    const asegurarAdmin = require("./utils/crearAdminAuto");
    setTimeout(() => {
      asegurarAdmin();
    }, 2000);
  });
}

module.exports = app;
