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

// Todo lo que sigue exige sesión de administrador.
router.use(autenticar, requiereRol('admin'));

// Resumen general
router.get('/resumen', dashboardControl.obtenerResumen);

// Ventas
router.get('/ventas-totales', dashboardControl.obtenerVentasTotales);
router.get('/ventas-por-mes', dashboardControl.obtenerVentasPorMes);
router.get('/ventas-por-dia', dashboardControl.obtenerVentasPorDia);
router.get('/ventas-por-categoria', dashboardControl.obtenerVentasPorCategoria);

// Pedidos
router.get('/pedidos-por-estado', dashboardControl.obtenerPedidosPorEstado);
router.get('/pedidos-recientes', dashboardControl.obtenerPedidosRecientes);

// Productos
router.get('/productos-bajo-stock', dashboardControl.obtenerProductosBajoStock);
router.get('/productos-mas-vendidos', dashboardControl.obtenerProductosMasVendidos);

// Usuarios
router.get('/usuarios-nuevos', dashboardControl.obtenerUsuariosNuevos);
router.get('/usuarios-por-rol', dashboardControl.obtenerUsuariosPorRol);

module.exports = router;
