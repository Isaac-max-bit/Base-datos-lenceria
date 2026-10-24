const express = require('express');
const app = express();
const port = 3000;

app.use(express.json()); // OBJETOS

//PRIMERA RUTA
app.get('/', (req, res) => {
    res.send('SERVIDOR LENCERIA ENSAYO')
})

// SERVIDOR ESCUCHANDO
app.listen(port , () => {
    console.log(`Servidor iniciando en http://localhost:${port}`); //http://localhost:3000
})