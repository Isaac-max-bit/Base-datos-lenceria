// Script de prueba de conexión: node probarSupabase.js
require('dotenv').config();

const supabase = require('./config/supabaseClient');

async function obtenerUsuarios() {
    console.log('Probando conexión con Supabase...');

    // Solo columnas seguras: nunca imprimas password_hash.
    const { data, error } = await supabase
        .from('Usuario')
        .select('id_usuario, nombre, email');

    if (error) {
        console.error('Error al consultar:', error.code, error.message);
        return;
    }

    console.log('¡Consulta exitosa!');
    console.log('Usuarios:', data);

    if (data.length === 0) {
        console.log('⚠️ Llegó vacío: si la tabla tiene filas, revisa las políticas RLS en Supabase.');
    }
}

obtenerUsuarios().catch(console.error);