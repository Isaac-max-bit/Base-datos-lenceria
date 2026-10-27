const supabase = require("./config/supabaseClient");

async function obtenerUsuarios() {
    console.log("Probando conexión con Supabase...");

    const { data, error } = await supabase
        .from("Usuario")
        .select("*");

    if (error) {
        console.error("Error al consultar:", error.message);
        return;
    }

    console.log("¡Consulta exitosa!");
    console.log("Usuarios:", data);
}

obtenerUsuarios().catch(console.error);