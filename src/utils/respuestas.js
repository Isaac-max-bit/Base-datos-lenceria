// ============================================================
// HELPERS COMPARTIDOS POR LOS CONTROLADORES
// (antes estaban copiados idénticos en cada controlador)
// ============================================================

// Convierte el ID de la URL en número. Devuelve null si no es
// un entero positivo.
const obtenerIdValido = (valor) => {
    const id = Number(valor);

    return Number.isInteger(id) && id > 0 ? id : null;
};

// Estado HTTP para un error controlado del servicio:
// 'conflicto' (correo repetido, registro en uso) -> 409, el resto -> 400
const estadoDeError = (resultado) =>
    resultado.tipo === 'conflicto' ? 409 : 400;

// Respuesta estándar para errores inesperados (caídas de Supabase, etc.)
// El detalle técnico solo se escribe en consola, no se envía al cliente.
const errorInterno = (res, contexto, mensajePublico, error) => {
    console.error(`${contexto}:`, error.message);

    return res.status(500).json({ error: mensajePublico });
};

module.exports = { obtenerIdValido, estadoDeError, errorInterno };
