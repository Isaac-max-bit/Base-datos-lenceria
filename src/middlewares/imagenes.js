const multer = require('multer');

// ============================================================
// SUBIDA DE IMÁGENES
// Los archivos se reciben en memoria, se validan y luego el
// servicio los envía a Supabase Storage. Nunca se guardan en
// el disco del servidor.
// ============================================================

const TIPOS_PERMITIDOS = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
]);

const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB por archivo
const MAXIMO_ARCHIVOS = 10;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: TAMANO_MAXIMO,
        files: MAXIMO_ARCHIVOS
    },
    fileFilter: (req, file, cb) => {
        if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
            return cb(new Error('FORMATO_NO_PERMITIDO'));
        }
        cb(null, true);
    }
});

// Acepta una imagen en "imagen" o varias en "imagenes".
const recibirArchivos = upload.fields([
    { name: 'imagen', maxCount: 1 },
    { name: 'imagenes', maxCount: MAXIMO_ARCHIVOS }
]);

const subirImagenes = (req, res, next) => {
    recibirArchivos(req, res, (error) => {
        if (!error) return next();

        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    error: 'Cada imagen debe pesar máximo 5 MB'
                });
            }

            if (error.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    error: `Puedes subir máximo ${MAXIMO_ARCHIVOS} imágenes a la vez`
                });
            }

            if (error.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    error: 'Campo de archivo no reconocido. Usa "imagen" o "imagenes".'
                });
            }

            return res.status(400).json({
                error: 'No se pudieron leer los archivos enviados'
            });
        }

        if (error.message === 'FORMATO_NO_PERMITIDO') {
            return res.status(400).json({
                error: 'Formato no permitido. Usa JPG, PNG, WEBP o AVIF.'
            });
        }

        return next(error);
    });
};

module.exports = { subirImagenes };
