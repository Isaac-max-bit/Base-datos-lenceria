const { obtenerSupabaseAdmin } = require('../../config/supabaseAdmin');

// ============================================================
// CARRITO
// El carrito vive en la tabla "Carrito":
//   id_carrito, usuario_id, variante_id, cantidad
// El precio y el stock NO se guardan aquí: se leen de
// VarianteProducto/Producto para que siempre estén al día.
// ============================================================

const TABLA = 'Carrito';

const CAMPOS = `
    id_carrito, usuario_id, variante_id, cantidad,
    VarianteProducto (
        id_variante, talla, color, stock, producto_id,
        Producto (
            id_producto, nombre, precio, precio_anterior, stock,
            ImagenProducto ( url, orden, es_principal )
        )
    )
`;

const MENSAJES = {
    sinServiceRole:
        'Falta SUPABASE_SERVICE_ROLE_KEY en el .env del backend. Sin ella no se puede usar el carrito.',
    varianteInvalida: 'La talla seleccionada no es válida',
    cantidadInvalida: 'La cantidad debe ser un entero entre 1 y 99',
    sinStock: (disponible) =>
        `Solo hay ${disponible} unidad(es) disponibles de esta talla`,
    itemNoExiste: 'El producto no está en tu carrito',
    carritoVacio: 'Tu carrito está vacío',
    sinStockAlConfirmar:
        'Alguno de los productos ya no tiene stock suficiente. Revisa tu carrito.'
};

const fallo = (mensaje, tipo = 'validacion') => ({ error: mensaje, tipo });

const esEnteroPositivo = (valor) => Number.isInteger(valor) && valor > 0;

const ordenarImagenes = (imagenes) =>
    [...imagenes].sort((a, b) => {
        if (Boolean(a.es_principal) !== Boolean(b.es_principal)) {
            return a.es_principal ? -1 : 1;
        }
        return (a.orden ?? 0) - (b.orden ?? 0);
    });

const normalizarItem = (fila) => {
    const variante = fila.VarianteProducto;
    const producto = variante?.Producto;

    if (!variante || !producto) return null;

    const imagenes = Array.isArray(producto.ImagenProducto)
        ? ordenarImagenes(producto.ImagenProducto)
        : [];

    const precio = Number(producto.precio) || 0;
    const cantidad = Number(fila.cantidad) || 0;

    return {
        id_carrito: fila.id_carrito,
        variante_id: fila.variante_id,
        cantidad,
        talla: variante.talla,
        color: variante.color,
        stock: Number(variante.stock) || 0,
        producto_id: producto.id_producto,
        nombre: producto.nombre,
        precio,
        precio_anterior: producto.precio_anterior ?? null,
        imagen: imagenes[0]?.url ?? null,
        subtotal: precio * cantidad
    };
};

const resumir = (filas) => {
    const items = (filas || []).map(normalizarItem).filter(Boolean);

    return {
        items,
        total: items.reduce((suma, item) => suma + item.subtotal, 0),
        cantidad: items.reduce((suma, item) => suma + item.cantidad, 0)
    };
};

const obtenerConAdmin = async (admin, usuarioId) => {
    const { data, error } = await admin
        .from(TABLA)
        .select(CAMPOS)
        .eq('usuario_id', usuarioId)
        .order('id_carrito', { ascending: true });

    if (error) throw error;
    return resumir(data);
};

const obtener = async (usuarioId) => {
    const admin = obtenerSupabaseAdmin();
    if (!admin) return fallo(MENSAJES.sinServiceRole, 'servidor');

    return obtenerConAdmin(admin, usuarioId);
};

const agregar = async (usuarioId, { variante_id, cantidad = 1 }) => {
    const admin = obtenerSupabaseAdmin();
    if (!admin) return fallo(MENSAJES.sinServiceRole, 'servidor');

    if (!esEnteroPositivo(variante_id)) {
        return fallo(MENSAJES.varianteInvalida);
    }

    if (!esEnteroPositivo(cantidad) || cantidad > 99) {
        return fallo(MENSAJES.cantidadInvalida);
    }

    const { data: variante, error: errorVariante } = await admin
        .from('VarianteProducto')
        .select('id_variante, stock')
        .eq('id_variante', variante_id)
        .maybeSingle();

    if (errorVariante) throw errorVariante;
    if (!variante) return fallo(MENSAJES.varianteInvalida);
    if (!variante.stock) return fallo(MENSAJES.sinStock(0), 'conflicto');

    const { data: existente, error: errorExistente } = await admin
        .from(TABLA)
        .select('id_carrito, cantidad')
        .eq('usuario_id', usuarioId)
        .eq('variante_id', variante_id)
        .maybeSingle();

    if (errorExistente) throw errorExistente;

    const nuevaCantidad = (Number(existente?.cantidad) || 0) + cantidad;

    if (nuevaCantidad > Number(variante.stock)) {
        return fallo(MENSAJES.sinStock(Number(variante.stock)), 'conflicto');
    }

    if (existente) {
        const { error } = await admin
            .from(TABLA)
            .update({ cantidad: nuevaCantidad })
            .eq('id_carrito', existente.id_carrito);

        if (error) throw error;
    } else {
        const { error } = await admin.from(TABLA).insert({
            usuario_id: usuarioId,
            variante_id,
            cantidad
        });

        if (error) throw error;
    }

    return obtenerConAdmin(admin, usuarioId);
};

const actualizar = async (usuarioId, idCarrito, cantidad) => {
    const admin = obtenerSupabaseAdmin();
    if (!admin) return fallo(MENSAJES.sinServiceRole, 'servidor');

    if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > 99) {
        return fallo('La cantidad debe ser un entero entre 0 y 99');
    }

    const { data: fila, error } = await admin
        .from(TABLA)
        .select('id_carrito, variante_id, VarianteProducto ( stock )')
        .eq('id_carrito', Number(idCarrito))
        .eq('usuario_id', usuarioId)
        .maybeSingle();

    if (error) throw error;
    if (!fila) return { noEncontrado: true };

    if (cantidad === 0) {
        const { error: errorBorrar } = await admin
            .from(TABLA)
            .delete()
            .eq('id_carrito', fila.id_carrito);

        if (errorBorrar) throw errorBorrar;
        return obtenerConAdmin(admin, usuarioId);
    }

    const stock = Number(fila.VarianteProducto?.stock) || 0;

    if (cantidad > stock) {
        return fallo(MENSAJES.sinStock(stock), 'conflicto');
    }

    const { error: errorActualizar } = await admin
        .from(TABLA)
        .update({ cantidad })
        .eq('id_carrito', fila.id_carrito);

    if (errorActualizar) throw errorActualizar;

    return obtenerConAdmin(admin, usuarioId);
};

const eliminar = async (usuarioId, idCarrito) => {
    const admin = obtenerSupabaseAdmin();
    if (!admin) return fallo(MENSAJES.sinServiceRole, 'servidor');

    const { data, error } = await admin
        .from(TABLA)
        .delete()
        .eq('id_carrito', Number(idCarrito))
        .eq('usuario_id', usuarioId)
        .select('id_carrito');

    if (error) throw error;
    if (!data || data.length === 0) return { noEncontrado: true };

    return obtenerConAdmin(admin, usuarioId);
};

const vaciar = async (usuarioId) => {
    const admin = obtenerSupabaseAdmin();
    if (!admin) return fallo(MENSAJES.sinServiceRole, 'servidor');

    const { error } = await admin.from(TABLA).delete().eq('usuario_id', usuarioId);
    if (error) throw error;

    return { items: [], total: 0, cantidad: 0 };
};

// ------------------------------------------------------------
// PEDIDOS
// ------------------------------------------------------------

const confirmar = async (usuarioId) => {
    const admin = obtenerSupabaseAdmin();
    if (!admin) return fallo(MENSAJES.sinServiceRole, 'servidor');

    const carrito = await obtenerConAdmin(admin, usuarioId);

    if (carrito.items.length === 0) {
        return fallo(MENSAJES.carritoVacio);
    }

    const sinStock = carrito.items.find((item) => item.cantidad > item.stock);
    if (sinStock) {
        return fallo(MENSAJES.sinStockAlConfirmar, 'conflicto');
    }

    // 1) Cabecera del pedido
    const { data: pedido, error: errorPedido } = await admin
        .from('Pedido')
        .insert({
            usuario_id: usuarioId,
            fecha: new Date().toISOString(),
            total: carrito.total
        })
        .select('id_pedido, usuario_id, fecha, total')
        .single();

    if (errorPedido) throw errorPedido;

    // 2) Detalle del pedido
    const detalles = carrito.items.map((item) => ({
        pedido_id: pedido.id_pedido,
        variante_id: item.variante_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal: item.subtotal
    }));

    const { error: errorDetalles } = await admin
        .from('DetallePedido')
        .insert(detalles);

    if (errorDetalles) throw errorDetalles;

    // 3) Descontar stock de cada variante
    for (const item of carrito.items) {
        const { error } = await admin
            .from('VarianteProducto')
            .update({ stock: item.stock - item.cantidad })
            .eq('id_variante', item.variante_id);

        if (error) throw error;
    }

    // 4) Actualizar el stock total de cada producto afectado
    const productosAfectados = [...new Set(carrito.items.map((item) => item.producto_id))];

    for (const productoId of productosAfectados) {
        const { data: variantes, error } = await admin
            .from('VarianteProducto')
            .select('stock')
            .eq('producto_id', productoId);

        if (error) throw error;

        const stockTotal = (variantes || []).reduce(
            (suma, variante) => suma + (Number(variante.stock) || 0),
            0
        );

        const { error: errorProducto } = await admin
            .from('Producto')
            .update({ stock: stockTotal })
            .eq('id_producto', productoId);

        if (errorProducto) throw errorProducto;
    }

    // 5) Vaciar el carrito
    const { error: errorVaciar } = await admin
        .from(TABLA)
        .delete()
        .eq('usuario_id', usuarioId);

    if (errorVaciar) throw errorVaciar;

    return {
        pedido,
        items: carrito.items,
        total: carrito.total
    };
};

const historial = async (usuarioId) => {
    const admin = obtenerSupabaseAdmin();
    if (!admin) return fallo(MENSAJES.sinServiceRole, 'servidor');

    const { data, error } = await admin
        .from('Pedido')
        .select(`
            id_pedido, fecha, total,
            DetallePedido (
                id_detalle, cantidad, precio_unitario, subtotal,
                VarianteProducto (
                    id_variante, talla, color,
                    Producto (
                        id_producto, nombre,
                        ImagenProducto ( url, orden, es_principal )
                    )
                )
            )
        `)
        .eq('usuario_id', usuarioId)
        .order('fecha', { ascending: false });

    if (error) throw error;

    return (data || []).map((pedido) => {
        const items = (pedido.DetallePedido || []).map((detalle) => {
            const variante = detalle.VarianteProducto;
            const producto = variante?.Producto;
            const imagenes = Array.isArray(producto?.ImagenProducto)
                ? ordenarImagenes(producto.ImagenProducto)
                : [];

            return {
                id_detalle: detalle.id_detalle,
                variante_id: variante?.id_variante ?? null,
                nombre: producto?.nombre ?? 'Producto',
                talla: variante?.talla ?? null,
                color: variante?.color ?? null,
                imagen: imagenes[0]?.url ?? null,
                cantidad: detalle.cantidad,
                precio_unitario: detalle.precio_unitario,
                subtotal: detalle.subtotal
            };
        });

        return {
            id_pedido: pedido.id_pedido,
            fecha: pedido.fecha,
            total: pedido.total,
            items,
            cantidad: items.reduce((suma, item) => suma + (Number(item.cantidad) || 0), 0)
        };
    });
};

module.exports = {
    obtener,
    agregar,
    actualizar,
    eliminar,
    vaciar,
    confirmar,
    historial
};
