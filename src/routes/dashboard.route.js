const express = require("express");
const router = express.Router();

const dashboardControl = require("../controller/dashboard.control");
const { autenticar, requiereRol } = require('../middlewares/auth');

// Montado en app.js como /api/dashboard

// GET /api/dashboard - Verificar que el módulo esté activo (público).
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        mensaje: 'Módulo de dashboard activo'
    });
});

// Todo lo que sigue exige sesión iniciada.
router.use(autenticar);

// Operación diaria: administradores y vendedores.
const operacion = requiereRol('admin', 'vendedor');

// Dinero, clientes y reportes históricos: solo administradores.
const soloAdmin = requiereRol('admin');

// Resumen general (incluye ingresos y ticket promedio).
router.get('/resumen', soloAdmin, dashboardControl.obtenerResumen);

// Ventas (todas incluyen montos en dinero).
router.get('/ventas-totales', soloAdmin, dashboardControl.obtenerVentasTotales);
router.get('/ventas-por-mes', soloAdmin, dashboardControl.obtenerVentasPorMes);
router.get('/ventas-por-dia', soloAdmin, dashboardControl.obtenerVentasPorDia);
router.get('/ventas-por-categoria', soloAdmin, dashboardControl.obtenerVentasPorCategoria);

// Pedidos: también los usa el vendedor para despachar.
router.get('/pedidos-por-estado', operacion, dashboardControl.obtenerPedidosPorEstado);
router.get('/pedidos-recientes', operacion, dashboardControl.obtenerPedidosRecientes);
router.get('/pedidos-por-dia', operacion, dashboardControl.obtenerPedidosPorDia);

// Productos: inventario y más vendidos.
router.get('/productos-bajo-stock', operacion, dashboardControl.obtenerProductosBajoStock);
router.get('/productos-mas-vendidos', operacion, dashboardControl.obtenerProductosMasVendidos);

// Usuarios: solo administradores.
router.get('/usuarios-nuevos', soloAdmin, dashboardControl.obtenerUsuariosNuevos);
router.get('/usuarios-por-rol', soloAdmin, dashboardControl.obtenerUsuariosPorRol);

module.exports = router;
