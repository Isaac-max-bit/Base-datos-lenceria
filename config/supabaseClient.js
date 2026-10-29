// ============================================================
// CLIENTE DE SUPABASE
// Se crea una sola vez y se reutiliza en todo el proyecto.
// Uso:  const supabase = require('../../config/supabaseClient');
// ============================================================
 
// Carga las variables del archivo .env (también sirve si este archivo
// se ejecuta solo, por ejemplo desde probarSupabase.js)
require('dotenv').config();
 
const { createClient } = require('@supabase/supabase-js');
 
// Se eliminan espacios accidentales al copiar y pegar las claves
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
 
// En un backend lo recomendable es la clave service_role (NUNCA en el frontend).
// Si no está definida, se usa la clave anon.
const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
).trim();
 
// Si falta algo, el servidor se detiene al iniciar con un mensaje claro,
// en lugar de fallar más tarde con un error difícil de entender.
if (!supabaseUrl) {
    throw new Error('Falta la variable SUPABASE_URL en el archivo .env');
}
 
if (!supabaseKey) {
    throw new Error(
        'Falta SUPABASE_ANON_KEY (o SUPABASE_SERVICE_ROLE_KEY) en el archivo .env'
    );
}
 
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        // Es un backend: no hay sesiones de usuario que guardar ni renovar
        persistSession: false,
        autoRefreshToken: false
    }
});
 
module.exports = supabase;
 