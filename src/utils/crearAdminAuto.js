const bcrypt = require("bcryptjs");
const { obtenerSupabaseAdmin } = require("../../config/supabaseAdmin");

async function asegurarAdmin() {
  const supabase = obtenerSupabaseAdmin();
  if (!supabase) return;

  const adminEmail = "admin@markethub.com";
  const adminPassword = "Admin123456";

  try {
    const { data: rol } = await supabase
      .from("Rol")
      .select("id_rol")
      .ilike("nombre", "admin")
      .maybeSingle();

    if (!rol) return;

    const { data: existe } = await supabase
      .from("Usuario")
      .select("id_usuario")
      .eq("email", adminEmail)
      .maybeSingle();

    if (existe) return;

    const hash = await bcrypt.hash(adminPassword, 10);

    await supabase.from("Usuario").insert([
      {
        nombre: "Admin Markethub",
        email: adminEmail,
        password_hash: hash,
        id_rol: rol.id_rol,
      },
    ]);

    console.log("Administrador por defecto creado.");
  } catch (error) {
    console.error("Error al crear admin automatico:", error.message);
  }
}

module.exports = asegurarAdmin;
