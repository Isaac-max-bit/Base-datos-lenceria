const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Faltan las variables de Supabase en .env");
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

module.exports = supabase;