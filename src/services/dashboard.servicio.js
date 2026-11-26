const { obtenerSupabaseAdmin } = require('../../config/supabaseAdmin');

// ============================================================
// SERVICIO DEL DASHBOARD
// Consultas de solo lectura para las estadísticas del panel.
//
// Tablas usadas:
//   Producto, VarianteProducto, TipoProducto, Usuario, Rol,
//   Pedido (id_pedido, usuario_id, fecha, total),
//   DetallePedido (pedido_id, variante_id, cantidad, subtotal)
//
// Se usa la service role porque RLS bloquea Usuario y Pedido
// con la clave pública. Estas funciones solo se exponen a
// administradores (ver dashboard.route.js).
// ============================================================

const ZONA_HORARIA = 'America/Bogota';
const TAMANO_PAGINA = 1000; // Supabase devuelve máximo 1000 filas por consulta.
const MS_POR_DIA = 24 * 60 * 60 * 1000;

const MENSAJES = {
    sinServiceRole:
        'Falta SUPABASE_SERVICE_ROLE_KEY en el .env del backend. Sin ella no se puede usar el dashboard.'
};

const fallo = (mensaje, tipo = 'validacion') => ({ error: mensaje, tipo });

// Entrega el cliente admin a cada consulta o devuelve el error estándar.
const conAdmin = (consulta) => async (...args) => {
    const admin = obtenerSupabaseAdmin();
    if (!admin) return fallo(MENSAJES.sinServiceRole, 'servidor');

    return consulta(admin, ...args);
};

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------

const redondear = (valor) => Math.round((Number(valor) || 0) * 100) / 100;

// Un embed de Supabase puede llegar como objeto o como arreglo de un elemento.
const unico = (valor) => (Array.isArray(valor) ? valor[0] ?? null : valor ?? null);

// Fecha (YYYY-MM-DD) según la zona horaria de la tienda.
const formatoDia = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

const claveDia = (fecha) => formatoDia.format(new Date(fecha));

// Cuenta filas de una tabla. "filtrar" permite agregar .eq(), .lte(), etc.
const contar = async (admin, tabla, filtrar = (consulta) => consulta) => {
    const { count, error } = await filtrar(
        admin.from(tabla).select('*', { count: 'exact', head: true })
    );

    if (error) throw error;
    return count ?? 0;
};

// Lee todas las filas de una consulta paginando de 1000 en 1000.
// La consulta debe tener un .order() estable.
const leerTodo = async (construirConsulta) => {
    const filas = [];

    for (let desde = 0; ; desde += TAMANO_PAGINA) {
        const { data, error } = await construirConsulta().range(
            desde,
            desde + TAMANO_PAGINA - 1
        );

        if (error) throw error;

        filas.push(...(data || []));
        if (!data || data.length < TAMANO_PAGINA) break;
    }

    return filas;
};

// Trae las líneas vendidas con su producto y categoría.
const leerDetalles = (admin) =>
    leerTodo(() =>
        admin
            .from('DetallePedido')
            .select(`
                id_detalle, cantidad, subtotal,
                VarianteProducto (
                    Producto (
                        id_producto, nombre,
                        TipoProducto ( nombre )
                    )
                )
            `)
            .order('id_detalle', { ascending: true })
    );

// ------------------------------------------------------------
// 1. Resumen general
// ------------------------------------------------------------

const obtenerResumen = conAdmin(async (admin, umbralStock = 5) => {
    const [
        totalProductos,
        totalUsuarios,
        totalPedidos,
        productosSinStock,
        productosStockBajo,
        pedidos
    ] = await Promise.all([
        contar(admin, 'Producto'),
        contar(admin, 'Usuario'),
        contar(admin, 'Pedido'),
        contar(admin, 'Producto', (q) => q.eq('stock', 0)),
        contar(admin, 'Producto', (q) => q.gt('stock', 0).lte('stock', umbralStock)),
        leerTodo(() =>
            admin
                .from('Pedido')
                .select('id_pedido, total')
                .order('id_pedido', { ascending: true })
        )
    ]);

    const ingresosTotales = pedidos.reduce(
        (suma, pedido) => suma + (Number(pedido.total) || 0),
        0
    );

    return {
        totalProductos,
        totalUsuarios,
        totalPedidos,
        ingresosTotales: redondear(ingresosTotales),
        ticketPromedio: totalPedidos > 0 ? redondear(ingresosTotales / totalPedidos) : 0,
        productosSinStock,
        productosStockBajo,
        umbralStockBajo: umbralStock,
        fechaConsulta: new Date().toISOString()
    };
});

// ------------------------------------------------------------
// 2. Ventas por día (últimos N días, con días sin ventas en 0)
// ------------------------------------------------------------

const obtenerVentasPorDia = conAdmin(async (admin, dias = 30) => {
    // Se pide un día extra para cubrir el borde por zona horaria.
    const desde = new Date(Date.now() - (dias + 1) * MS_POR_DIA).toISOString();

    const pedidos = await leerTodo(() =>
        admin
            .from('Pedido')
            .select('id_pedido, fecha, total')
            .gte('fecha', desde)
            .order('id_pedido', { ascending: true })
    );

    const porDia = new Map();

    for (let i = dias - 1; i >= 0; i--) {
        porDia.set(claveDia(Date.now() - i * MS_POR_DIA), { pedidos: 0, ingresos: 0 });
    }

    for (const pedido of pedidos) {
        const registro = porDia.get(claveDia(pedido.fecha));
        if (!registro) continue;

        registro.pedidos += 1;
        registro.ingresos += Number(pedido.total) || 0;
    }

    const serie = [...porDia.entries()].map(([fecha, { pedidos: cantidad, ingresos }]) => ({
        fecha,
        pedidos: cantidad,
        ingresos: redondear(ingresos)
    }));

    return {
        dias,
        zonaHoraria: ZONA_HORARIA,
        totalPedidos: serie.reduce((suma, dia) => suma + dia.pedidos, 0),
        totalIngresos: redondear(serie.reduce((suma, dia) => suma + dia.ingresos, 0)),
        serie
    };
});

// Igual que ventas-por-dia, pero sin ingresos. Es la versión que pueden
// consultar los vendedores para su gráfica de pedidos.
const obtenerPedidosPorDia = conAdmin(async (admin, dias = 7) => {
    const { zonaHoraria, totalPedidos, serie } = await obtenerVentasPorDia(dias);

    return {
        dias,
        zonaHoraria,
        totalPedidos,
        serie: serie.map(({ fecha, pedidos }) => ({ fecha, pedidos }))
    };
});

// ------------------------------------------------------------
// 3. Productos más vendidos
// ------------------------------------------------------------

const obtenerProductosMasVendidos = conAdmin(async (admin, limite = 5) => {
    const detalles = await leerDetalles(admin);
    const porProducto = new Map();

    for (const detalle of detalles) {
        const producto = unico(unico(detalle.VarianteProducto)?.Producto);
        if (!producto) continue;

        const acumulado = porProducto.get(producto.id_producto) || {
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            unidadesVendidas: 0,
            ingresos: 0
        };

        acumulado.unidadesVendidas += Number(detalle.cantidad) || 0;
        acumulado.ingresos += Number(detalle.subtotal) || 0;
        porProducto.set(producto.id_producto, acumulado);
    }

    return [...porProducto.values()]
        .map((p) => ({ ...p, ingresos: redondear(p.ingresos) }))
        .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas || b.ingresos - a.ingresos)
        .slice(0, limite);
});

// ------------------------------------------------------------
// 4. Ventas por categoría
// ------------------------------------------------------------

const obtenerVentasPorCategoria = conAdmin(async (admin) => {
    const detalles = await leerDetalles(admin);
    const porCategoria = new Map();

    for (const detalle of detalles) {
        const producto = unico(unico(detalle.VarianteProducto)?.Producto);
        if (!producto) continue;

        const categoria = unico(producto.TipoProducto)?.nombre ?? 'Sin categoría';
        const acumulado = porCategoria.get(categoria) || {
            categoria,
            unidadesVendidas: 0,
            ingresos: 0
        };

        acumulado.unidadesVendidas += Number(detalle.cantidad) || 0;
        acumulado.ingresos += Number(detalle.subtotal) || 0;
        porCategoria.set(categoria, acumulado);
    }

    return [...porCategoria.values()]
        .map((c) => ({ ...c, ingresos: redondear(c.ingresos) }))
        .sort((a, b) => b.ingresos - a.ingresos);
});

// ------------------------------------------------------------
// 5. Variantes con stock bajo o agotado
// ------------------------------------------------------------

const obtenerProductosBajoStock = conAdmin(async (admin, umbral = 5, limite = 20) => {
    const { data, error } = await admin
        .from('VarianteProducto')
        .select('id_variante, talla, color, stock, Producto ( id_producto, nombre )')
        .lte('stock', umbral)
        .order('stock', { ascending: true })
        .order('id_variante', { ascending: true })
        .limit(limite);

    if (error) throw error;

    return (data || []).map((variante) => {
        const producto = unico(variante.Producto);
        const stock = Number(variante.stock) || 0;

        return {
            id_variante: variante.id_variante,
            id_producto: producto?.id_producto ?? null,
            nombre: producto?.nombre ?? 'Producto',
            talla: variante.talla,
            color: variante.color,
            stock,
            agotado: stock === 0
        };
    });
});

// ------------------------------------------------------------
// 6. Pedidos recientes
// ------------------------------------------------------------

const obtenerPedidosRecientes = conAdmin(async (admin, limite = 10) => {
    const { data, error } = await admin
        .from('Pedido')
        .select(
            'id_pedido, fecha, total, usuario_id, id_estado, ' +
            'Usuario ( nombre, email ), EstadoPedido ( nombre )'
        )
        .order('fecha', { ascending: false })
        .order('id_pedido', { ascending: false })
        .limit(limite);

    if (error) throw error;

    return (data || []).map((pedido) => {
        const usuario = unico(pedido.Usuario);

        return {
            id_pedido: pedido.id_pedido,
            fecha: pedido.fecha,
            total: Number(pedido.total) || 0,
            usuario_id: pedido.usuario_id,
            id_estado: pedido.id_estado ?? null,
            estado: unico(pedido.EstadoPedido)?.nombre ?? null,
            cliente: usuario?.nombre ?? null,
            email: usuario?.email ?? null
        };
    });
});

// ------------------------------------------------------------
// 7. Usuarios por rol
// ------------------------------------------------------------

const obtenerUsuariosPorRol = conAdmin(async (admin) => {
    const usuarios = await leerTodo(() =>
        admin
            .from('Usuario')
            .select('id_usuario, Rol ( nombre )')
            .order('id_usuario', { ascending: true })
    );

    const porRol = new Map();

    for (const usuario of usuarios) {
        const rol = unico(usuario.Rol)?.nombre ?? 'sin_rol';
        porRol.set(rol, (porRol.get(rol) || 0) + 1);
    }

    return [...porRol.entries()]
        .map(([rol, total]) => ({ rol, total }))
        .sort((a, b) => b.total - a.total);
});

// ------------------------------------------------------------
// 8. Ventas totales (todo el historial o un rango de fechas)
//    desde / hasta: "YYYY-MM-DD" en hora de Colombia, opcionales.
// ------------------------------------------------------------

const DESFASE_COLOMBIA = '-05:00'; // Colombia no usa horario de verano.

const obtenerVentasTotales = conAdmin(async (admin, desde = null, hasta = null) => {
    const pedidos = await leerTodo(() => {
        let consulta = admin.from('Pedido').select('id_pedido, total');

        if (desde) consulta = consulta.gte('fecha', `${desde}T00:00:00${DESFASE_COLOMBIA}`);
        if (hasta) consulta = consulta.lte('fecha', `${hasta}T23:59:59.999${DESFASE_COLOMBIA}`);

        return consulta.order('id_pedido', { ascending: true });
    });

    const totales = pedidos.map((pedido) => Number(pedido.total) || 0);
    const ingresos = totales.reduce((suma, total) => suma + total, 0);

    return {
        periodo: { desde, hasta },
        totalPedidos: pedidos.length,
        ingresosTotales: redondear(ingresos),
        ticketPromedio: pedidos.length > 0 ? redondear(ingresos / pedidos.length) : 0,
        pedidoMasAlto: totales.length > 0 ? redondear(Math.max(...totales)) : 0
    };
});

// ------------------------------------------------------------
// 9. Pedidos por estado
//    Pedido.id_estado -> EstadoPedido.nombre
// ------------------------------------------------------------

const obtenerPedidosPorEstado = conAdmin(async (admin) => {
    const pedidos = await leerTodo(() =>
        admin
            .from('Pedido')
            .select('id_pedido, total, id_estado, EstadoPedido ( nombre )')
            .order('id_pedido', { ascending: true })
    );

    const porEstado = new Map();

    for (const pedido of pedidos) {
        const estado = unico(pedido.EstadoPedido)?.nombre ?? 'SIN ESTADO';
        const acumulado = porEstado.get(estado) || {
            id_estado: pedido.id_estado ?? null,
            estado,
            pedidos: 0,
            ingresos: 0
        };

        acumulado.pedidos += 1;
        acumulado.ingresos += Number(pedido.total) || 0;
        porEstado.set(estado, acumulado);
    }

    return [...porEstado.values()]
        .map((e) => ({ ...e, ingresos: redondear(e.ingresos) }))
        .sort((a, b) => b.pedidos - a.pedidos);
});

// ------------------------------------------------------------
// 10. Ventas por mes (últimos N meses, con meses sin ventas en 0)
// ------------------------------------------------------------

const obtenerVentasPorMes = conAdmin(async (admin, meses = 12) => {
    // Mes actual en hora de Colombia: "YYYY-MM"
    const [anioActual, mesActual] = claveDia(Date.now()).split('-').map(Number);

    const claves = [];
    for (let i = meses - 1; i >= 0; i--) {
        const indice = anioActual * 12 + (mesActual - 1) - i;
        const anio = Math.floor(indice / 12);
        const mes = (indice % 12) + 1;
        claves.push(`${anio}-${String(mes).padStart(2, '0')}`);
    }

    const pedidos = await leerTodo(() =>
        admin
            .from('Pedido')
            .select('id_pedido, fecha, total')
            .gte('fecha', `${claves[0]}-01T00:00:00${DESFASE_COLOMBIA}`)
            .order('id_pedido', { ascending: true })
    );

    const porMes = new Map(claves.map((clave) => [clave, { pedidos: 0, ingresos: 0 }]));

    for (const pedido of pedidos) {
        const registro = porMes.get(claveDia(pedido.fecha).slice(0, 7));
        if (!registro) continue;

        registro.pedidos += 1;
        registro.ingresos += Number(pedido.total) || 0;
    }

    const serie = [...porMes.entries()].map(([mes, { pedidos: cantidad, ingresos }]) => ({
        mes,
        pedidos: cantidad,
        ingresos: redondear(ingresos)
    }));

    return {
        meses,
        zonaHoraria: ZONA_HORARIA,
        totalPedidos: serie.reduce((suma, m) => suma + m.pedidos, 0),
        totalIngresos: redondear(serie.reduce((suma, m) => suma + m.ingresos, 0)),
        serie
    };
});

// ------------------------------------------------------------
// 11. Usuarios nuevos (registrados en los últimos N días)
// ------------------------------------------------------------

const obtenerUsuariosNuevos = conAdmin(async (admin, dias = 30) => {
    const desde = new Date(Date.now() - (dias + 1) * MS_POR_DIA).toISOString();

    const usuarios = await leerTodo(() =>
        admin
            .from('Usuario')
            .select('id_usuario, fecha_registro')
            .gte('fecha_registro', desde)
            .order('id_usuario', { ascending: true })
    );

    const porDia = new Map();

    for (let i = dias - 1; i >= 0; i--) {
        porDia.set(claveDia(Date.now() - i * MS_POR_DIA), 0);
    }

    for (const usuario of usuarios) {
        const clave = claveDia(usuario.fecha_registro);
        if (porDia.has(clave)) porDia.set(clave, porDia.get(clave) + 1);
    }

    const serie = [...porDia.entries()].map(([fecha, nuevos]) => ({ fecha, nuevos }));

    return {
        dias,
        zonaHoraria: ZONA_HORARIA,
        totalNuevos: serie.reduce((suma, dia) => suma + dia.nuevos, 0),
        serie
    };
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
    obtenerPedidosPorDia,
    obtenerVentasPorCategoria,
    obtenerUsuariosPorRol
};