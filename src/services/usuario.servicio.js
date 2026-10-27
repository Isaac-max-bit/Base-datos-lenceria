
let listaUsuarios = [
    { id: 1, nombre: 'Isaac', email: 'isaac@gmail.com' },
    { id: 2, nombre: 'Manuela', email: 'manuela@gmail.com' },
    { id: 3, nombre: 'Estella', email: 'estella@gmail.com' }
];

let siguienteId = 4;

const obtenerTodos = () => listaUsuarios;

const buscarPorId = (id) =>
    listaUsuarios.find(usuario => usuario.id === Number(id));

const buscarPorNombre = (nombre) =>
    listaUsuarios.filter(usuario =>
        usuario.nombre.toLowerCase().includes(nombre.toLowerCase())
    );

const crear = (datos) => {
    const { nombre, email } = datos;

    if (listaUsuarios.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { error: 'El correo ya está registrado' };
    }

    const nuevoUsuario = {
        id: siguienteId++,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase()
    };

    listaUsuarios.push(nuevoUsuario);
    return { usuario: nuevoUsuario };
};

const actualizar = (id, datos, parcial = false) => {
    const usuario = buscarPorId(id);

    if (!usuario) return null;

    const { nombre, email } = datos;

    if (!parcial && (!nombre || !email)) {
        return { error: 'Nombre y email son obligatorios' };
    }

    if (nombre !== undefined) {
        if (typeof nombre !== 'string' || !nombre.trim()) {
            return { error: 'El nombre no es válido' };
        }
    }

    if (email !== undefined) {
        if (
            typeof email !== 'string' ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            return { error: 'El email no es válido' };
        }

        const emailLimpio = email.trim().toLowerCase();
        const duplicado = listaUsuarios.some(
            u => u.id !== Number(id) && u.email.toLowerCase() === emailLimpio
        );

        if (duplicado) return { error: 'El correo ya está registrado' };
    }

    if (nombre !== undefined) usuario.nombre = nombre.trim();
    if (email !== undefined) usuario.email = email.trim().toLowerCase();

    return { usuario };
};

const eliminar = (id) => {
    const indice = listaUsuarios.findIndex(u => u.id === Number(id));

    if (indice === -1) return false;

    listaUsuarios.splice(indice, 1);
    return true;
};

module.exports = {
    obtenerTodos,
    buscarPorId,
    buscarPorNombre,
    crear,
    actualizar,
    eliminar
};
