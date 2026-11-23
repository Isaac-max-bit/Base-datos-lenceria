const { obtenerSupabaseAdmin } = require('../../config/supabaseAdmin');
const { HASH_INVITADO } = require('../utils/invitado');

// ============================================================
// PEDIDOS DE INVITADO (CHECKOUT SIN CUENTA)
// El cliente envía solo los datos necesarios para entregar el
// pedido. Los precios y el stock NUNCA se toman del navegador:
// se leen de VarianteProducto/Producto y se validan aquí.
//
// Como Pedido.usuario_id es obligatorio, cada compra sin cuenta
// se guarda con un "usuario invitado" (ver utils/invitado.js).
// ============================================================

const ESTADO_PENDIENTE = 1;
const ROL_CLIENTE = 'cliente';

const METODOS_PAGO = {
    contraentrega: 'Contraentrega',
    transferencia: 'Transferencia bancaria',
    tarjeta: 'Tarjeta débito/crédito',
    addi: 'ADDI'
};

const MAX_ITEMS = 30;
const MAX_CANTIDAD = 99;
const MAX_DIRECCION = 200; // Usuario.direccion es varchar(200)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MENSAJES = {
    sinServiceRole:
        'Falta SUPABASE_SERVICE_ROLE_KEY en el .env del backend. Sin ella no se pueden registrar pedidos.',
    itemsInvalidos: 'Tu carrito está vacío o no es válido',
    demasiadosItems: `No se pueden comprar más de ${MAX_ITEMS} productos distintos en un pedido`,
    varianteInvalida: 'Uno de los productos ya no está disponible',
    cantidadInvalida: `La cantidad debe ser un entero entre 1 y ${MAX_CANTIDAD}`,
    nombreInvalido: 'Escribe tu nombre completo',
    emailInvalido: 'Escribe un correo electrónico válido',
    telefonoInvalido: 'Escribe un teléfono de contacto válido',
    direccionInvalida: 'Escribe la dirección de entrega',
    ciudadInvalida: 'Escribe la ciudad de entrega',
    metodoPagoInvalido: 'Selecciona un método de pago válido',
    sinStock: (disponible) =>
        `Solo hay ${disponible} unidad(es) disponibles de una de las tallas`,
    sinStockAlConfirmar:
        'Alguno de los productos ya no tiene stock suficiente. Revisa tu carrito.',
    rolCliente:
        'Falta el rol "cliente" en la tabla Rol. Ejecuta sql/auth-carrito.sql en Supabase.'
};

const fallo = (mensaje, tipo = 'validacion') => ({ error: mensaje, tipo });

const errorPublico = (mensaje, tipo = 'validacion') => {
    const error = new Error(mensaje);
    error.tipo = tipo;
    error.publico = mensaje;
    return error;
};

const esEnteroPositivo = (valor) => Number.isInteger(valor) && valor > 0;

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

const ordenarImagenes = (imagenes) =>
    [...imagenes].sort((a, b) => {
        if (Boolean(a.es_principal) !== Boolean(b.es_principal)) {
            return a.es_principal ? -1 : 1;
        }
        return (a.orden ?? 0) - (b.orden ?? 0);
    });

// ------------------------------------------------------------
// VALIDACIÓN
// ------------------------------------------------------------
const normalizarItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        return { error: MENSAJES.itemsInvalidos };
    }

    // Si llega dos veces la misma variante se suma la cantidad.
    const agrupados = new Map();

    for (const item of items) {
        const varianteId = Number(item?.variante_id);
        const cantidad = Number(item?.cantidad ?? 1);

        if (!esEnteroPositivo(varianteId)) {
            return { error: MENSAJES.varianteInvalida };
        }

        if (!esEnteroPositivo(cantidad) || cantidad > MAX_CANTIDAD) {
            return { error: MENSAJES.cantidadInvalida };
        }

        const acumulada = (agrupados.get(varianteId) || 0) + cantidad;

        if (acumulada > MAX_CANTIDAD) {
            return { error: MENSAJES.cantidadInvalida };
        }

        agrupados.set(varianteId, acumulada);
    }

    if (agrupados.size > MAX_ITEMS) {
        return { error: MENSAJES.demasiadosItems };
    }

    return {
        items: [...agrupados].map(([variante_id, cantidad]) => ({
            variante_id,
            cantidad
        }))
    };
};

const validarContacto = (datos) => {
    const nombre = texto(datos.nombre);
    if (nombre.length < 2 || nombre.length > 100) {
        return { error: MENSAJES.nombreInvalido };
    }

    const email = texto(datos.email).toLowerCase();
    if (!EMAIL_REGEX.test(email) || email.length > 254) {
        return { error: MENSAJES.emailInvalido };
    }

    const telefono = texto(datos.telefono);
    const digitos = telefono.replace(/\D/g, '');
    if (digitos.length < 7 || telefono.length > 20) {
        return { error: MENSAJES.telefonoInvalido };
    }

    const direccion = texto(datos.direccion);
    if (direccion.length < 5 || direccion.length > 160) {
        return { error: MENSAJES.direccionInvalida };
    }

    const ciudad = texto(datos.ciudad);
    if (ciudad.length < 2 || ciudad.length > 60) {
        return { error: MENSAJES.ciudadInvalida };
    }

    const pais = texto(datos.pais).slice(0, 60) || 'Colombia';

    const metodoPago = texto(datos.metodo_pago).toLowerCase() || 'contraentrega';
    if (!METODOS_PAGO[metodoPago]) {
        return { error: MENSAJES.metodoPagoInvalido };
    }

    return {
        contacto: {
            nombre,
            email,
            telefono,
            direccion,
            pais,
            ciudad,
            departamento: texto(datos.departamento).slice(0, 60) || null,
            notas: texto(datos.notas).slice(0, 300) || null,
            metodoPago
        }
    };
};

// La dirección completa (calle + ciudad + pago + notas) se guarda en
// Usuario.direccion, que admite 200 caracteres. Se prioriza la
// dirección y el método de pago; las notas se recortan si no caben.
const construirDireccion = (contacto, emailReservado = null) => {
    const ubicacion = [
        contacto.ciudad,
        contacto.departamento,
        contacto.pais !== 'Colombia' ? contacto.pais : null
    ]
        .filter(Boolean)
        .join(', ');

    const partes = [
        `${contacto.direccion}, ${ubicacion}`,
        `Pago: ${METODOS_PAGO[contacto.metodoPago]}`
    ];

    if (contacto.notas) partes.push(`Notas: ${contacto.notas}`);

    const prefijo = emailReservado ? `Correo: ${emailReservado} · ` : '';

    return `${prefijo}${partes.join(' · ')}`.slice(0, MAX_DIRECCION);
};

// ------------------------------------------------------------
// PRODUCTOS Y STOCK
// ------------------------------------------------------------
const CAMPOS_VARIANTE = `
    id_variante, talla, color, stock, producto_id,
    Producto (
        id_producto, nombre, precio, precio_anterior, stock,
        ImagenProducto ( url, orden, es_principal )
    )
`;

const cargarLineas = async (admin, items) => {
    const ids = items.map((item) => item.variante_id);

    const { data, error } = await admin
        .from('VarianteProducto')
        .select(CAMPOS_VARIANTE)
        .in('id_variante', ids);

    if (error) throw error;

    const porId = new Map(
        (data || []).map((fila) => [Number(fila.id_variante), fila])
    );

    return items.map((item) => {
        const variante = porId.get(item.variante_id);
        const producto = variante?.Producto;

        if (!variante || !producto) {
            throw errorPublico(MENSAJES.varianteInvalida);
        }

        const stock = Number(variante.stock) || 0;

        if (stock < item.cantidad) {
            throw errorPublico(MENSAJES.sinStock(stock), 'conflicto');
        }

        const precio = Number(producto.precio) || 0;
        const imagenes = Array.isArray(producto.ImagenProducto)
            ? ordenarImagenes(producto.ImagenProducto)
            : [];

        return {
            variante_id: Number(variante.id_variante),
            cantidad: item.cantidad,
            talla: variante.talla,
            color: variante.color,
            stock,
            producto_id: producto.id_producto,
            nombre: producto.nombre,
            precio,
            precio_anterior: producto.precio_anterior ?? null,
            imagen: imagenes[0]?.url ?? null,
            subtotal: precio * item.cantidad
        };
    });
};

const recalcularStockProductos = async (admin, productoIds) => {
    for (const productoId of new Set(productoIds)) {
        const { data, error } = await admin
            .from('VarianteProducto')
            .select('stock')
            .eq('producto_id', productoId);

        if (error) throw error;

        const total = (data || []).reduce(
            (suma, variante) => suma + (Number(variante.stock) || 0),
            0
        );

        const { error: errorProducto } = await admin
            .from('Producto')
            .update({ stock: total })
            .eq('id_producto', productoId);

        if (errorProducto) throw errorProducto;
    }
};

// Descuenta el stock solo si sigue siendo el mismo que se validó
// (control optimista para no vender de más si alguien compró antes).
const descontarStock = async (admin, lineas) => {
    const descontadas = [];

    try {
        for (const linea of lineas) {
            const { data, error } = await admin
                .from('VarianteProducto')
                .update({ stock: linea.stock - linea.cantidad })
                .eq('id_variante', linea.variante_id)
                .eq('stock', linea.stock)
                .select('id_variante');

            if (error) throw error;

            if (!data || data.length === 0) {
                throw errorPublico(MENSAJES.sinStockAlConfirmar, 'conflicto');
            }

            descontadas.push(linea);
        }

        await recalcularStockProductos(
            admin,
            lineas.map((linea) => linea.producto_id)
        );

        return descontadas;
    } catch (error) {
        await restaurarStock(admin, descontadas);

        try {
            await recalcularStockProductos(
                admin,
                descontadas.map((linea) => linea.producto_id)
            );
        } catch (errorStock) {
            console.error(
                'No se pudo recalcular el stock tras restaurar:',
                errorStock.message
            );
        }

        throw error;
    }
};

const restaurarStock = async (admin, lineas) => {
    for (const linea of lineas) {
        try {
            await admin
                .from('VarianteProducto')
                .update({ stock: linea.stock })
                .eq('id_variante', linea.variante_id);
        } catch (error) {
            console.error('No se pudo restaurar el stock:', error.message);
        }
    }
};

// ------------------------------------------------------------
// USUARIO INVITADO
// ------------------------------------------------------------
const obtenerRolCliente = async (admin) => {
    const { data, error } = await admin
        .from('Rol')
        .select('id_rol')
        .ilike('nombre', ROL_CLIENTE)
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw errorPublico(MENSAJES.rolCliente, 'servidor');

    return data.id_rol;
};

const emailSintetico = () =>
    `invitado+${Date.now().toString(36)}${Math.random()
        .toString(36)
        .slice(2, 8)}@markethub.local`;

/**
 * Devuelve el id del usuario al que se asociará el pedido.
 * - Si el correo no existe, crea un usuario invitado con ese correo.
 * - Si ya es un invitado, actualiza sus datos de contacto.
 * - Si es una cuenta real, NO se toca: se crea un invitado aparte
 *   y el correo real queda escrito al inicio de la dirección.
 */
const resolverUsuarioInvitado = async (admin, contacto) => {
    const { data: existente, error } = await admin
        .from('Usuario')
        .select('id_usuario, password_hash')
        .eq('email', contacto.email)
        .maybeSingle();

    if (error) throw error;

    const esInvitado = existente?.password_hash === HASH_INVITADO;

    if (existente && esInvitado) {
        const { error: errorUpdate } = await admin
            .from('Usuario')
            .update({
                nombre: contacto.nombre,
                telefono: contacto.telefono,
                direccion: construirDireccion(contacto)
            })
            .eq('id_usuario', existente.id_usuario);

        if (errorUpdate) throw errorUpdate;

        return { id: existente.id_usuario, creado: false };
    }

    const reservado = Boolean(existente);
    const emailFinal = reservado ? emailSintetico() : contacto.email;

    const valores = {
        nombre: contacto.nombre,
        email: emailFinal,
        password_hash: HASH_INVITADO,
        telefono: contacto.telefono,
        direccion: construirDireccion(
            contacto,
            reservado ? contacto.email : null
        ),
        id_rol: await obtenerRolCliente(admin)
    };

    const { data, error: errorInsert } = await admin
        .from('Usuario')
        .insert(valores)
        .select('id_usuario')
        .single();

    if (!errorInsert) return { id: data.id_usuario, creado: true };

    // Carrera: otra petición creó el mismo invitado al mismo tiempo.
    if (errorInsert.code === '23505') {
        const { data: otra } = await admin
            .from('Usuario')
            .select('id_usuario, password_hash')
            .eq('email', emailFinal)
            .maybeSingle();

        if (otra?.password_hash === HASH_INVITADO) {
            await admin
                .from('Usuario')
                .update({
                    nombre: contacto.nombre,
                    telefono: contacto.telefono,
                    direccion: construirDireccion(
                        contacto,
                        reservado ? contacto.email : null
                    )
                })
                .eq('id_usuario', otra.id_usuario);

            return { id: otra.id_usuario, creado: false };
        }
    }

    throw errorInsert;
};

// ------------------------------------------------------------
// CREAR PEDIDO
// ------------------------------------------------------------
const crear = async (datos) => {
    const admin = obtenerSupabaseAdmin();
    if (!admin) return fallo(MENSAJES.sinServiceRole, 'servidor');

    const itemsNormalizados = normalizarItems(datos?.items);
    if (itemsNormalizados.error) return fallo(itemsNormalizados.error);

    const contactoNormalizado = validarContacto(datos || {});
    if (contactoNormalizado.error) return fallo(contactoNormalizado.error);

    const { contacto } = contactoNormalizado;
    const lineas = await cargarLineas(admin, itemsNormalizados.items);
    const total = lineas.reduce((suma, linea) => suma + linea.subtotal, 0);

    let usuario = null;
    let pedidoId = null;
    let descontadas = [];

    try {
        usuario = await resolverUsuarioInvitado(admin, contacto);

        const { data: pedido, error: errorPedido } = await admin
            .from('Pedido')
            .insert({
                usuario_id: usuario.id,
                fecha: new Date().toISOString(),
                total,
                id_estado: ESTADO_PENDIENTE
            })
            .select('id_pedido, fecha, total, id_estado')
            .single();

        if (errorPedido) throw errorPedido;
        pedidoId = pedido.id_pedido;

        const { error: errorDetalles } = await admin
            .from('DetallePedido')
            .insert(
                lineas.map((linea) => ({
                    pedido_id: pedidoId,
                    variante_id: linea.variante_id,
                    cantidad: linea.cantidad,
                    precio_unitario: linea.precio,
                    subtotal: linea.subtotal
                }))
            );

        if (errorDetalles) throw errorDetalles;

        descontadas = await descontarStock(admin, lineas);

        return {
            pedido: {
                ...pedido,
                estado: 'Pendiente',
                metodo_pago: contacto.metodoPago,
                metodo_pago_nombre: METODOS_PAGO[contacto.metodoPago]
            },
            items: lineas,
            total,
            contacto: {
                nombre: contacto.nombre,
                email: contacto.email,
                telefono: contacto.telefono,
                pais: contacto.pais,
                ciudad: contacto.ciudad
            }
        };
    } catch (error) {
        // Revertir lo que se alcanzó a escribir.
        if (descontadas.length > 0) {
            await restaurarStock(admin, descontadas);

            try {
                await recalcularStockProductos(
                    admin,
                    descontadas.map((linea) => linea.producto_id)
                );
            } catch (errorStock) {
                console.error(
                    'No se pudo recalcular el stock del producto:',
                    errorStock.message
                );
            }
        }

        if (pedidoId) {
            try {
                await admin
                    .from('DetallePedido')
                    .delete()
                    .eq('pedido_id', pedidoId);
                await admin.from('Pedido').delete().eq('id_pedido', pedidoId);
            } catch (errorPedido) {
                console.error(
                    'No se pudo deshacer el pedido:',
                    errorPedido.message
                );
            }
        }

        if (usuario?.creado) {
            try {
                await admin
                    .from('Usuario')
                    .delete()
                    .eq('id_usuario', usuario.id);
            } catch (errorUsuario) {
                console.error(
                    'No se pudo eliminar el usuario invitado:',
                    errorUsuario.message
                );
            }
        }

        throw error;
    }
};

module.exports = {
    crear,
    METODOS_PAGO
};
