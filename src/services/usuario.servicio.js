const bcrypt = require("bcryptjs");
const { obtenerSupabaseAdmin } = require("../../config/supabaseAdmin");

// ⚠️ Nombre EXACTO de la tabla en Supabase (Postgres distingue mayúsculas
// cuando la tabla se creó con comillas). Es el mismo estilo que 'Producto'.
const TABLA = "Usuario";

// Las operaciones de usuarios (login, perfil, registro) pasan por el backend
// con la service role key: los datos de cuentas nunca se leen con la clave
// pública.
const db = () => {
  const cliente = obtenerSupabaseAdmin();

  if (!cliente) {
    const error = new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en el .env del backend",
    );
    error.code = "SIN_SERVICE_ROLE";
    throw error;
  }

  return cliente;
};

const CAMPOS_PUBLICOS =
  "id_usuario, nombre, email, telefono, direccion, fecha_registro, id_rol, Rol ( nombre )";

const normalizarUsuario = (fila) => {
  if (!fila) return null;

  const { Rol, ...usuario } = fila;
  return {
    ...usuario,
    rol: Rol?.nombre ?? null,
  };
};

// Lo ÚNICO que el cliente puede enviar. Nunca id_rol, id_usuario,
// fecha_registro ni password_hash: eso evita que alguien se haga admin.
const CAMPOS_PERMITIDOS = [
  "nombre",
  "email",
  "password",
  "telefono",
  "direccion",
];

const ROL_CLIENTE = "cliente"; // todo usuario creado por la API es cliente
const SALT_ROUNDS = 10;
const PASSWORD_MIN = 8;
const PASSWORD_MAX_BYTES = 72; // bcrypt ignora lo que pase de 72 bytes

const CODIGO_UNICO = "23505";
const CODIGO_LLAVE_FORANEA = "23503";
const CODIGO_CHECK = "23514";
const CODIGO_RLS = "42501"; // row-level security

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MENSAJES = {
  cuerpoInvalido: "Debes enviar un objeto JSON con los datos del usuario",
  sinCampos: "Debes enviar al menos un campo para actualizar",
  nombreObligatorio: "El nombre es obligatorio",
  emailObligatorio: "El email es obligatorio",
  passwordObligatoria: "La contraseña es obligatoria",
  nombreInvalido: "El nombre no es válido",
  emailInvalido: "El email no tiene un formato válido",
  passwordInvalida: `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX_BYTES} caracteres`,
  telefonoInvalido: "El teléfono no es válido",
  direccionInvalida: "La dirección no es válida",
  emailRepetido: "El correo ya está registrado",
  credencialesInvalidas: "Correo o contraseña incorrectos",
  datosRechazados: "La base de datos rechazó los valores enviados",
  usuarioEnUso:
    "No se puede eliminar el usuario porque tiene registros asociados",
};

const fallo = (mensaje, tipo = "validacion") => ({ error: mensaje, tipo });

const esObjeto = (valor) =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

// Texto opcional: null se conserva, cadena vacía pasa a null.
const textoOpcional = (valor) => (valor === null ? null : valor.trim() || null);

// Escapa % _ \ para que el texto buscado no actúe como comodín en ILIKE.
const escaparLike = (texto) => texto.replace(/[\\%_]/g, "\\$&");

// ------------------------------------------------------------
// VALIDACIÓN
// modo: 'crear' | 'completo' (PUT) | 'parcial' (PATCH)
// ------------------------------------------------------------
const validarYNormalizar = (datos, modo) => {
  const valores = {};

  if (modo !== "parcial") {
    if (datos.nombre === undefined)
      return { error: MENSAJES.nombreObligatorio };
    if (datos.email === undefined) return { error: MENSAJES.emailObligatorio };
  }
  if (modo === "crear" && datos.password === undefined) {
    return { error: MENSAJES.passwordObligatoria };
  }

  if (datos.nombre !== undefined) {
    if (typeof datos.nombre !== "string" || !datos.nombre.trim()) {
      return {
        error:
          modo === "parcial"
            ? MENSAJES.nombreInvalido
            : MENSAJES.nombreObligatorio,
      };
    }
    valores.nombre = datos.nombre.trim();
  }

  if (datos.email !== undefined) {
    const email =
      typeof datos.email === "string" ? datos.email.trim().toLowerCase() : "";
    if (!EMAIL_REGEX.test(email)) return { error: MENSAJES.emailInvalido };
    valores.email = email;
  }

  if (datos.password !== undefined) {
    if (
      typeof datos.password !== "string" ||
      datos.password.length < PASSWORD_MIN ||
      Buffer.byteLength(datos.password, "utf8") > PASSWORD_MAX_BYTES
    ) {
      return { error: MENSAJES.passwordInvalida };
    }
    valores.password = datos.password;
  }

  if (datos.telefono !== undefined) {
    if (datos.telefono !== null && typeof datos.telefono !== "string") {
      return { error: MENSAJES.telefonoInvalido };
    }
    valores.telefono = textoOpcional(datos.telefono);
  }

  if (datos.direccion !== undefined) {
    if (datos.direccion !== null && typeof datos.direccion !== "string") {
      return { error: MENSAJES.direccionInvalida };
    }
    valores.direccion = textoOpcional(datos.direccion);
  }

  return { valores };
};

// Resuelve el id del rol por nombre (admin, vendedor, cliente).
const obtenerIdRol = async (nombre) => {
  const { data, error } = await db()
    .from("Rol")
    .select("id_rol")
    .ilike("nombre", nombre)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id_rol ?? null;
};

// Valida, rechaza campos no permitidos y convierte password -> password_hash.
// Devuelve { valores } o un objeto de error { error, tipo }.
const prepararValores = async (datos, modo) => {
  const noPermitidos = Object.keys(datos).filter(
    (c) => !CAMPOS_PERMITIDOS.includes(c),
  );
  if (noPermitidos.length > 0) {
    return fallo(`Campos no permitidos: ${noPermitidos.join(", ")}`);
  }

  const validacion = validarYNormalizar(datos, modo);
  if (validacion.error) return fallo(validacion.error);

  const { password, ...valores } = validacion.valores;

  // Se hashea DESPUÉS de validar para no gastar CPU con datos inválidos.
  if (password !== undefined) {
    valores.password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  // PUT = reemplazo completo: lo opcional que no llega se deja en null.
  if (modo === "completo") {
    if (valores.telefono === undefined) valores.telefono = null;
    if (valores.direccion === undefined) valores.direccion = null;
  }

  if (modo === "crear") {
    const idRol = await obtenerIdRol(ROL_CLIENTE);

    if (!idRol) {
      return fallo(
        'Falta el rol "cliente" en la tabla Rol. Ejecuta sql/auth-carrito.sql en Supabase.',
        "servidor",
      );
    }

    valores.id_rol = idRol;
  }

  return { valores };
};

const traducirErrorBD = (error) => {
  if (error.code === CODIGO_UNICO)
    return fallo(MENSAJES.emailRepetido, "conflicto");
  if (error.code === CODIGO_CHECK) return fallo(MENSAJES.datosRechazados);
  if (error.code === CODIGO_RLS) {
    return fallo(
      "La base de datos bloqueó la operación por seguridad (RLS). " +
        "Configura SUPABASE_SERVICE_ROLE_KEY en el backend.",
      "servidor",
    );
  }
  return null;
};

// ------------------------------------------------------------
// CONSULTAS
// ------------------------------------------------------------
const obtenerTodos = async () => {
  const { data, error } = await db()
    .from(TABLA)
    .select(CAMPOS_PUBLICOS)
    .order("id_usuario", { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizarUsuario);
};

const buscarPorId = async (id) => {
  const { data, error } = await db()
    .from(TABLA)
    .select(CAMPOS_PUBLICOS)
    .eq("id_usuario", Number(id))
    .maybeSingle();

  if (error) throw error;
  return normalizarUsuario(data);
};

// ------------------------------------------------------------
// AUTENTICACIÓN
// ------------------------------------------------------------
// Comprueba email + contraseña contra el hash guardado con bcrypt.
// Nunca devuelve password_hash al cliente.
const autenticar = async (email, password) => {
  if (
    typeof email !== "string" ||
    !EMAIL_REGEX.test(email.trim().toLowerCase())
  ) {
    return fallo(MENSAJES.credencialesInvalidas, "no_autorizado");
  }

  if (typeof password !== "string" || !password) {
    return fallo(MENSAJES.credencialesInvalidas, "no_autorizado");
  }

  const { data, error } = await db()
    .from(TABLA)
    .select(`${CAMPOS_PUBLICOS}, password_hash`)
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;

  // Mismo mensaje si el usuario no existe o si la contraseña no coincide:
  // así no se puede averiguar qué correos están registrados.
  if (!data || !data.password_hash) {
    return fallo(MENSAJES.credencialesInvalidas, "no_autorizado");
  }

  const coincide = await bcrypt.compare(password, data.password_hash);
  if (!coincide) {
    return fallo(MENSAJES.credencialesInvalidas, "no_autorizado");
  }

  const { password_hash, ...usuario } = data;
  return { usuario: normalizarUsuario(usuario) };
};

// (Esta función faltaba: el controlador la llamaba y daba error 500)
const buscarPorNombre = async (nombre) => {
  const { data, error } = await db()
    .from(TABLA)
    .select(CAMPOS_PUBLICOS)
    .ilike("nombre", `%${escaparLike(nombre)}%`)
    .order("id_usuario", { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizarUsuario);
};

// ------------------------------------------------------------
// ESCRITURA
// ------------------------------------------------------------
const crear = async (datos) => {
  console.log("📥 DATOS RECIBIDOS DESDE LA WEB:", datos);
  if (!esObjeto(datos)) return fallo(MENSAJES.cuerpoInvalido);

  const preparado = await prepararValores(datos, "crear");
  if (preparado.error) return preparado;

  const { data, error } = await db()
    .from(TABLA)
    .insert(preparado.valores)
    .select(CAMPOS_PUBLICOS)
    .single();

  if (error) {
    const conocido = traducirErrorBD(error);
    if (conocido) return conocido;
    throw error;
  }

  return { usuario: normalizarUsuario(data) };
};

// PUT (parcial = false): nombre y email obligatorios.
// PATCH (parcial = true): solo cambia lo enviado.
const actualizar = async (id, datos, parcial = false) => {
  if (!esObjeto(datos)) return fallo(MENSAJES.cuerpoInvalido);
  if (Object.keys(datos).length === 0) return fallo(MENSAJES.sinCampos);

  const preparado = await prepararValores(
    datos,
    parcial ? "parcial" : "completo",
  );
  if (preparado.error) return preparado;

  const { data, error } = await db()
    .from(TABLA)
    .update(preparado.valores)
    .eq("id_usuario", Number(id))
    .select(CAMPOS_PUBLICOS)
    .maybeSingle();

  if (error) {
    const conocido = traducirErrorBD(error);
    if (conocido) return conocido;
    throw error;
  }

  if (!data) return null; // el usuario no existe
  return { usuario: normalizarUsuario(data) };
};

const eliminar = async (id) => {
  const { data, error } = await db()
    .from(TABLA)
    .delete()
    .eq("id_usuario", Number(id))
    .select("id_usuario");

  if (error) {
    if (error.code === CODIGO_LLAVE_FORANEA) {
      return fallo(MENSAJES.usuarioEnUso, "conflicto");
    }
    throw error;
  }

  if (!data || data.length === 0) return null; // no existía
  return { eliminado: true };
};

module.exports = {
  obtenerTodos,
  buscarPorId,
  buscarPorNombre,
  autenticar,
  crear,
  actualizar,
  eliminar,
};
