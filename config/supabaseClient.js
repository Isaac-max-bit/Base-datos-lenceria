const { createClient } = require('@supabase/supabase-js');

// Las variables de entorno las carga src/app.js con dotenv (un solo lugar).
// Se aceptan los nombres nuevos y los antiguos para que tu .env actual siga funcionando.
const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Faltan SUPABASE_URL y/o SUPABASE_KEY en el archivo .env');
}

// En un backend no hay sesión de navegador que guardar ni renovar.
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

module.exports = supabase;