const express = require('express');
const app = express();
const port = 3000;

app.use(express.json()); // OBJETOS

//PRIMERA RUTA
app.get('/', (req, res) => {
    res.send('SERVIDOR LENCERIA ENSAYO')
})

//SEGUNDA RUTA
app.get('/productos', (req, res) => {
    res.send({
        id: 1, nombre: 'Conjunto de lenceria', precio: 100, stock: 10
    })
})

/*
METODOS HTML O REQUEST
LEER GET
ESCRIBIR POST
ACTUALIZAR PUT -> Actualiza todo
ACTUALIZAR PATCH -> Actualiza parcialmente
ELIMINAR DELETE
*/


/*
CREAR USUARIOS
ACTUALIZAR USUARIOS
LEER TODOS USUARIOS
BUSCAR UN USUARIO
ELIMINIAR UN USUARIO
*/

const listaUsuarios = [
    { id: 1, nombre: 'Isaac', email: 'isaac@example.com' },
    { id: 2, nombre: 'Manuela', email: 'manuela@example.com' },
    { id: 3, nombre: 'Estella', email: 'estella@example.com' }
];

//BUSCAR USUARIO

app.get('/usuarios/', (req, res) => {
    const id = req.params.id;
    res.send(listaUsuarios)
})

//BUSCAR USUARIO CON MAS INFORMACIÓN

app.post('/usuarios/', (req, res) => {
    const id = req.query.id;
    const nombre = req.query.nombre;
    const password = req.query.password;

    console.log(id, "desde la url");

    res.send(id, nombre)
})

app.post("/usuario", (req, res) => {
    const { nombre, correo, password } = req.body;

    console.log(nombre);
})


app.get('/productos', (req, res) => {
    res.send({
        id: 1, nombre: 'Conjunto de lenceria', precio: 100, stock: 10
    })
})


// SERVIDOR ESCUCHANDO
app.listen(port , () => {
    console.log(`Servidor iniciando en http://localhost:${port}`); //http://localhost:3000
})