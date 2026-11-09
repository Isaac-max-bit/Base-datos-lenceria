// Punto de entrada alternativo: node server.js
// La aplicación real está en src/app.js y es la que usan npm start / npm run dev.
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
