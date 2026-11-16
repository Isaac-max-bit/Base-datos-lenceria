// ============================================================
// CONTROLADOR DEL DASHBOARD
// Solo administradores (la protección está en dashboard.route.js).
// ============================================================

const dashboardServicio = require('../services/dashboard.servicio');
const { estadoDeError } = require('../utils/respuestas');

// Lee un parámetro de query como entero dentro de un rango.
// Sin valor devuelve el predeterminado; con valor inválido devuelve null.
const leerEntero = (valor, predeterminado, minimo, maximo) => {
    if (valor === undefined || valor === '') return predeterminado;

    const numero = Number(valor);

    return Number.isInteger(numero) && numero >= minimo && numero <= maximo
        ? numero
        : null;
};

// Valida una fecha "YYYY-MM-DD" real. Vacía devuelve null; inválida devuelve undefined.
const leerFecha = (valor) => {
    if (valor === undefined || valor === '') return null;
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return undefined;

    const fecha = new Date(`${valor}T00:00:00Z`);
    return Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor
        ? undefined
        : valor;
};

// Crea un controlador: valida parámetros, llama al servicio y arma la respuesta.
//   leerParametros(req) -> arreglo de argumentos, o { error } si son inválidos.
const crearControlador = ({ servicio, mensaje, mensajeError, leerParametros }) =>
    async (req, res) => {
        try {
            const parametros = leerParametros ? leerParametros(req) : [];

            if (parametros.error) {
                return res.status(400).json({
                    success: false,
                    mensaje: parametros.error
                });
            }

            const resultado = await servicio(...parametros);

            if (resultado?.error) {
                return res.status(estadoDeError(resultado)).json({
                    success: false,
                    mensaje: resultado.error
                });
            }

            return res.status(200).json({
                success: true,
                mensaje,
                data: resultado
            });
        } catch (error) {
            console.error(`${mensajeError}:`, error);

            return res.status(500).json({
                success: false,
                mensaje: mensajeError
            });
        }
    };

// Atajo para endpoints con un solo parámetro entero.
const conEntero = (nombre, etiqueta, predeterminado, minimo, maximo) => (req) => {
    const valor = leerEntero(req.query[nombre], predeterminado, minimo, maximo);
    return valor === null
        ? { error: `${etiqueta} debe ser un entero entre ${minimo} y ${maximo}` }
        : [valor];
};

// GET /api/dashboard/resumen?umbral=5
const obtenerResumen = crearControlador({
    servicio: dashboardServicio.obtenerResumen,
    mensaje: 'Resumen del dashboard obtenido correctamente',
    mensajeError: 'No se pudo obtener el resumen del dashboard',
    leerParametros: conEntero('umbral', 'El umbral', 5, 0, 1000)
});

// GET /api/dashboard/ventas-totales?desde=2026-01-01&hasta=2026-12-31
const obtenerVentasTotales = crearControlador({
    servicio: dashboardServicio.obtenerVentasTotales,
    mensaje: 'Ventas totales obtenidas correctamente',
    mensajeError: 'No se pudieron obtener las ventas totales',
    leerParametros: (req) => {
        const desde = leerFecha(req.query.desde);
        const hasta = leerFecha(req.query.hasta);

        if (desde === undefined) return { error: 'La fecha "desde" debe tener formato YYYY-MM-DD' };
        if (hasta === undefined) return { error: 'La fecha "hasta" debe tener formato YYYY-MM-DD' };
        if (desde && hasta && desde > hasta) {
            return { error: 'La fecha "desde" no puede ser posterior a "hasta"' };
        }

        return [desde, hasta];
    }
});

// GET /api/dashboard/pedidos-por-estado
const obtenerPedidosPorEstado = crearControlador({
    servicio: dashboardServicio.obtenerPedidosPorEstado,
    mensaje: 'Pedidos por estado obtenidos correctamente',
    mensajeError: 'No se pudieron obtener los pedidos por estado'
});

// GET /api/dashboard/pedidos-recientes?limite=10
const obtenerPedidosRecientes = crearControlador({
    servicio: dashboardServicio.obtenerPedidosRecientes,
    mensaje: 'Pedidos recientes obtenidos correctamente',
    mensajeError: 'No se pudieron obtener los pedidos recientes',
    leerParametros: conEntero('limite', 'El límite', 10, 1, 50)
});

// GET /api/dashboard/productos-bajo-stock?umbral=5&limite=20
const obtenerProductosBajoStock = crearControlador({
    servicio: dashboardServicio.obtenerProductosBajoStock,
    mensaje: 'Productos con stock bajo obtenidos correctamente',
    mensajeError: 'No se pudieron obtener los productos con stock bajo',
    leerParametros: (req) => {
        const umbral = leerEntero(req.query.umbral, 5, 0, 1000);
        const limite = leerEntero(req.query.limite, 20, 1, 100);

        if (umbral === null) return { error: 'El umbral debe ser un entero entre 0 y 1000' };
        if (limite === null) return { error: 'El límite debe ser un entero entre 1 y 100' };

        return [umbral, limite];
    }
});

// GET /api/dashboard/productos-mas-vendidos?limite=5
const obtenerProductosMasVendidos = crearControlador({
    servicio: dashboardServicio.obtenerProductosMasVendidos,
    mensaje: 'Productos más vendidos obtenidos correctamente',
    mensajeError: 'No se pudieron obtener los productos más vendidos',
    leerParametros: conEntero('limite', 'El límite', 5, 1, 50)
});

// GET /api/dashboard/ventas-por-mes?meses=12
const obtenerVentasPorMes = crearControlador({
    servicio: dashboardServicio.obtenerVentasPorMes,
    mensaje: 'Ventas por mes obtenidas correctamente',
    mensajeError: 'No se pudieron obtener las ventas por mes',
    leerParametros: conEntero('meses', 'Los meses', 12, 1, 36)
});

// GET /api/dashboard/usuarios-nuevos?dias=30
const obtenerUsuariosNuevos = crearControlador({
    servicio: dashboardServicio.obtenerUsuariosNuevos,
    mensaje: 'Usuarios nuevos obtenidos correctamente',
    mensajeError: 'No se pudieron obtener los usuarios nuevos',
    leerParametros: conEntero('dias', 'Los días', 30, 1, 365)
});

// GET /api/dashboard/ventas-por-dia?dias=30
const obtenerVentasPorDia = crearControlador({
    servicio: dashboardServicio.obtenerVentasPorDia,
    mensaje: 'Ventas por día obtenidas correctamente',
    mensajeError: 'No se pudieron obtener las ventas por día',
    leerParametros: conEntero('dias', 'Los días', 30, 1, 365)
});

// GET /api/dashboard/ventas-por-categoria
const obtenerVentasPorCategoria = crearControlador({
    servicio: dashboardServicio.obtenerVentasPorCategoria,
    mensaje: 'Ventas por categoría obtenidas correctamente',
    mensajeError: 'No se pudieron obtener las ventas por categoría'
});

// GET /api/dashboard/usuarios-por-rol
const obtenerUsuariosPorRol = crearControlador({
    servicio: dashboardServicio.obtenerUsuariosPorRol,
    mensaje: 'Usuarios por rol obtenidos correctamente',
    mensajeError: 'No se pudieron obtener los usuarios por rol'
});

module.exports = {
    obtenerResumen,
    obtenerVentasTotales,
    obtenerPedidosPorEstado,
    obtenerPedidosRecientes,
    obtenerProductosBajoStock,
    obtenerProductosMasVendidos,
    obtenerVentasPorMes,
    obtenerUsuariosNuevos,
    obtenerVentasPorDia,
    obtenerVentasPorCategoria,
    obtenerUsuariosPorRol
};