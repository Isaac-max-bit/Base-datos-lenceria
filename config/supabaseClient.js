const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Buscamos cualquiera de las dos opciones para evitar que falle
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

// VALIDACION
if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Faltan claves de Supabase en el archivo .env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;