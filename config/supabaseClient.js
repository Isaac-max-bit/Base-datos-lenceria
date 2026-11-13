
/**
 * ==========================================================
 * CONFIGURACIÓN DEL CLIENTE DE SUPABASE
 * Proyecto: Lencería Luxury
 * Backend: Node.js + Express
 * Base de datos: PostgreSQL (Supabase)
 * ==========================================================
 */

// 1. Importar Supabase
const { createClient } = require("@supabase/supabase-js");


// ==========================================================
// 2. OBTENER VARIABLES DE ENTORNO
// ==========================================================

// URL del proyecto Supabase
const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;


// Clave pública de Supabase
const SUPABASE_KEY =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;


// ==========================================================
// 3. VALIDAR LAS CREDENCIALES
// ==========================================================

if (!SUPABASE_URL) {
    throw new Error(
        "ERROR: No se encontró SUPABASE_URL en el archivo .env"
    );
}

if (!SUPABASE_KEY) {
    throw new Error(
        "ERROR: No se encontró la clave de Supabase en el archivo .env"
    );
}


// ==========================================================
// 4. CREAR CLIENTE DE SUPABASE
// ==========================================================

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);


// ==========================================================
// 5. EXPORTAR CLIENTE
// ==========================================================

module.exports = supabase;
