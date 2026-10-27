
const express = require('express');
const app = express();
const port = 3000;

// ==========================================
// CONFIGURACIÓN DEL SERVIDOR
// ==========================================

// Permite recibir y procesar solicitudes con JSON
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
    res.send('SERVIDOR LENCERIA ENSAYO');
});

// ==========================================
// RUTA DE PRODUCTOS
// ==========================================

// Por ahora usamos un producto de ejemplo
app.get('/productos', (req, res) => {
    res.json({
        id: 1,
        nombre: 'Conjunto de lencería',
        precio: 100,
        stock: 10
    });
});

// ==========================================
// BASE DE DATOS TEMPORAL DE USUARIOS
// ==========================================

// Los datos se guardan en memoria.
// Se perderán cuando reinicies el servidor.
let listaUsuarios = [
    {
        id: 1,
        nombre: 'Isaac',
        email: 'isaac@example.com',
        password: '123456'
    },
    {
        id: 2,
        nombre: 'Manuela',
        email: 'manuela@example.com',
        password: 'abcdef'
    },
    {
        id: 3,
        nombre: 'Estella',
        email: 'estella@example.com',
        password: '654321'
    }
];

// Genera el próximo ID disponible
let siguienteId = 4;

// ==========================================
// 1. LEER TODOS LOS USUARIOS
// GET /usuarios
// ==========================================

app.get('/usuarios', (req, res) => {
    // No enviamos las contraseñas en la respuesta
    const usuariosPublicos = listaUsuarios.map(
        ({ password, ...usuario }) => usuario
    );

    res.status(200).json({
        mensaje: 'Lista de usuarios',
        total: usuariosPublicos.length,
        usuarios: usuariosPublicos
    });
});

// ==========================================
// 2. BUSCAR USUARIO POR ID
// GET /usuarios/2
// ==========================================

app.get('/usuarios/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'El ID debe ser un número entero positivo'
        });
    }

    const usuario = listaUsuarios.find(u => u.id === id);

    if (!usuario) {
        return res.status(404).json({
            error: 'Usuario no encontrado'
        });
    }

    // Excluimos la contraseña de la respuesta
    const { password, ...usuarioPublico } = usuario;

    res.status(200).json(usuarioPublico);
});

// ==========================================
// 3. BUSCAR USUARIOS POR NOMBRE
// GET /usuarios/buscar?nombre=isaac
// ==========================================

// Esta ruta debe estar antes de /usuarios/:id
// para evitar que "buscar" se interprete como un ID.
app.get('/usuarios/buscar', (req, res) => {
    const nombre = req.query.nombre;

    if (typeof nombre !== 'string' || !nombre.trim()) {
        return res.status(400).json({
            error: 'Debes proporcionar un nombre para buscar'
        });
    }

    const resultados = listaUsuarios
        .filter(u =>
            u.nombre.toLowerCase().includes(nombre.trim().toLowerCase())
        )
        .map(({ password, ...usuario }) => usuario);

    res.status(200).json({
        total: resultados.length,
        usuarios: resultados
    });
});

// ==========================================
// 4. CREAR USUARIO
// POST /usuarios
// ==========================================

app.post('/usuarios', (req, res) => {
    const { nombre, email, password } = req.body;

    // Validación de campos obligatorios
    if (
        typeof nombre !== 'string' ||
        !nombre.trim() ||
        typeof email !== 'string' ||
        !email.trim() ||
        typeof password !== 'string' ||
        !password.trim()
    ) {
        return res.status(400).json({
            error: 'Nombre, email y contraseña son obligatorios'
        });
    }

    // Validación básica del correo
    const emailLimpio = email.trim().toLowerCase();
    const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoEmail.test(emailLimpio)) {
        return res.status(400).json({
            error: 'El formato del email no es válido'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            error: 'La contraseña debe tener al menos 8 caracteres'
        });
    }

    // Evitamos correos duplicados
    const emailExiste = listaUsuarios.some(
        u => u.email.toLowerCase() === emailLimpio
    );

    if (emailExiste) {
        return res.status(409).json({
            error: 'Ya existe un usuario con ese email'
        });
    }

    const nuevoUsuario = {
        id: siguienteId++,
        nombre: nombre.trim(),
        email: emailLimpio,
        password
    };

    listaUsuarios.push(nuevoUsuario);

    // Nunca devolvemos la contraseña
    const { password: contrasena, ...usuarioPublico } = nuevoUsuario;

    res.status(201).json({
        mensaje: 'Usuario creado correctamente',
        usuario: usuarioPublico
    });
});

// ==========================================
// 5. ACTUALIZAR USUARIO COMPLETO
// PUT /usuarios/2
// ==========================================

app.put('/usuarios/:id', (req, res) => {
    const id = Number(req.params.id);
    const { nombre, email, password } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'ID no válido'
        });
    }

    const usuario = listaUsuarios.find(u => u.id === id);

    if (!usuario) {
        return res.status(404).json({
            error: 'Usuario no encontrado'
        });
    }

    // PUT requiere los campos editables completos
    if (
        typeof nombre !== 'string' ||
        !nombre.trim() ||
        typeof email !== 'string' ||
        !email.trim() ||
        typeof password !== 'string' ||
        !password.trim()
    ) {
        return res.status(400).json({
            error: 'Debes enviar nombre, email y contraseña'
        });
    }

    const emailLimpio = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
        return res.status(400).json({
            error: 'El formato del email no es válido'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            error: 'La contraseña debe tener al menos 8 caracteres'
        });
    }

    const emailExiste = listaUsuarios.some(
        u => u.id !== id && u.email.toLowerCase() === emailLimpio
    );

    if (emailExiste) {
        return res.status(409).json({
            error: 'Ese email ya pertenece a otro usuario'
        });
    }

    usuario.nombre = nombre.trim();
    usuario.email = emailLimpio;
    usuario.password = password;

    const { password: contrasena, ...usuarioPublico } = usuario;

    res.status(200).json({
        mensaje: 'Usuario actualizado completamente',
        usuario: usuarioPublico
    });
});

// ==========================================
// 6. ACTUALIZAR USUARIO PARCIALMENTE
// PATCH /usuarios/2
// ==========================================

app.patch('/usuarios/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'ID no válido'
        });
    }

    const usuario = listaUsuarios.find(u => u.id === id);

    if (!usuario) {
        return res.status(404).json({
            error: 'Usuario no encontrado'
        });
    }

    const campos = Object.keys(req.body);
    const permitidos = ['nombre', 'email', 'password'];

    // Rechazamos campos desconocidos o un body vacío
    if (
        campos.length === 0 ||
        campos.some(campo => !permitidos.includes(campo))
    ) {
        return res.status(400).json({
            error: 'Envía al menos un campo válido: nombre, email o password'
        });
    }

    const { nombre, email, password } = req.body;

    if (nombre !== undefined) {
        if (typeof nombre !== 'string' || !nombre.trim()) {
            return res.status(400).json({
                error: 'El nombre no puede estar vacío'
            });
        }

        usuario.nombre = nombre.trim();
    }

    if (email !== undefined) {
        if (
            typeof email !== 'string' ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            return res.status(400).json({
                error: 'El email no es válido'
            });
        }

        const emailLimpio = email.trim().toLowerCase();

        const emailExiste = listaUsuarios.some(
            u => u.id !== id && u.email.toLowerCase() === emailLimpio
        );

        if (emailExiste) {
            return res.status(409).json({
                error: 'Ese email ya pertenece a otro usuario'
            });
        }

        usuario.email = emailLimpio;
    }

    if (password !== undefined) {
        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({
                error: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        usuario.password = password;
    }

    const { password: contrasena, ...usuarioPublico } = usuario;

    res.status(200).json({
        mensaje: 'Usuario actualizado parcialmente',
        usuario: usuarioPublico
    });
});

// ==========================================
// 7. ELIMINAR USUARIO
// DELETE /usuarios/2
// ==========================================

app.delete('/usuarios/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'ID no válido'
        });
    }

    const indice = listaUsuarios.findIndex(u => u.id === id);

    if (indice === -1) {
        return res.status(404).json({
            error: 'Usuario no encontrado'
        });
    }

    listaUsuarios.splice(indice, 1);

    res.status(200).json({
        mensaje: 'Usuario eliminado correctamente',
        id: id
    });
});

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// JSON mal formado
app.use((err, req, res, next) => {
    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        'body' in err
    ) {
        return res.status(400).json({
            error: 'El JSON enviado no tiene un formato válido'
        });
    }

    next(err);
});

// Ruta inexistente
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada'
    });
});

// Errores inesperados
app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        error: 'Error interno del servidor'
    });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(port, () => {
    console.log(`Servidor iniciado en http://localhost:${port}`);
});
