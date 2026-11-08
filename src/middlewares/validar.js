// ============================================================
// MIDDLEWARES DE VALIDACIÓN COMPARTIDOS (usuarios y productos)
// ============================================================

// Valida que el parámetro :id sea un número entero positivo.
const validarId = (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'El ID debe ser un número entero positivo'
        });
    }

    next();
};

// Valida que el body sea un objeto JSON no vacío.
// En Express 5 req.body es undefined si no llega body, por eso se comprueba primero.
const validarBody = (req, res, next) => {
    if (
        !req.body ||
        typeof req.body !== 'object' ||
        Array.isArray(req.body) ||
        Object.keys(req.body).length === 0
    ) {
        return res.status(400).json({
            error: 'Debes enviar un objeto JSON con los datos'
        });
    }

    next();
};

module.exports = { validarId, validarBody };