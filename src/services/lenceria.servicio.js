
let productos = [
    {
        id: 1,
        nombre: 'Conjunto de lencería',
        precio: 100,
        stock: 10
    },
    {
        id: 2,
        nombre: 'Body de encaje',
        precio: 85,
        stock: 5
    }
];

let siguienteId = 3;

const obtenerTodos = () => productos;

const buscarPorId = (id) =>
    productos.find(producto => producto.id === Number(id));

const crear = ({ nombre, precio, stock }) => {
    if (typeof nombre !== 'string' || !nombre.trim()) {
        return { error: 'El nombre es obligatorio' };
    }

    if (typeof precio !== 'number' || !Number.isFinite(precio) || precio < 0) {
        return { error: 'El precio debe ser un número válido no negativo' };
    }

    if (!Number.isInteger(stock) || stock < 0) {
        return { error: 'El stock debe ser un entero no negativo' };
    }

    const producto = {
        id: siguienteId++,
        nombre: nombre.trim(),
        precio,
        stock
    };

    productos.push(producto);
    return { producto };
};

const actualizar = (id, datos) => {
    const producto = buscarPorId(id);

    if (!producto) return null;

    const permitidos = ['nombre', 'precio', 'stock'];
    const campos = Object.keys(datos);

    if (
        campos.length === 0 ||
        campos.some(campo => !permitidos.includes(campo))
    ) {
        return { error: 'Debes enviar campos válidos para actualizar' };
    }

    if (datos.nombre !== undefined) {
        if (typeof datos.nombre !== 'string' || !datos.nombre.trim()) {
            return { error: 'El nombre no es válido' };
        }
    }

    if (datos.precio !== undefined) {
        if (
            typeof datos.precio !== 'number' ||
            !Number.isFinite(datos.precio) ||
            datos.precio < 0
        ) {
            return { error: 'El precio no es válido' };
        }
    }

    if (datos.stock !== undefined) {
        if (!Number.isInteger(datos.stock) || datos.stock < 0) {
            return { error: 'El stock no es válido' };
        }
    }

    Object.assign(producto, datos);

    return { producto };
};

const eliminar = (id) => {
    const indice = productos.findIndex(p => p.id === Number(id));

    if (indice === -1) return false;

    productos.splice(indice, 1);
    return true;
};

module.exports = {
    obtenerTodos,
    buscarPorId,
    crear,
    actualizar,
    eliminar
};
