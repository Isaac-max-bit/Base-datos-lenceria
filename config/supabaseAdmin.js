const { createClient } = require('@supabase/supabase-js');

// Cliente con la service role key. Se usa SOLO en el backend para operaciones
// que RLS bloquea con la clave publishable (subir archivos a Storage y escribir
// en "ImagenProducto"). La service role nunca debe llegar al frontend.
let cliente = null;

const obtenerSupabaseAdmin = () => {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) return null;
    if (cliente) return cliente;

    cliente = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    return cliente;
};

module.exports = { obtenerSupabaseAdmin };
