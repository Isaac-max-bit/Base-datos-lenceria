
const supabase = require("../../config/supabaseClient");

// Contar registros de una tabla
const contarRegistros = async (tabla) => {
  const { count, error } = await supabase
    .from(tabla)
    .select("*", {
      count: "exact",
      head: true
    });

  if (error) {
    throw error;
  }

  return count ?? 0;
};

// Obtener resumen general
const obtenerResumen = async () => {
  const [
    totalProductos,
    totalUsuarios,
    totalPedidos
  ] = await Promise.all([
    contarRegistros("Producto"),
    contarRegistros("Usuario"),
    contarRegistros("Pedido")
  ]);

  return {
    totalProductos,
    totalUsuarios,
    totalPedidos,
    fechaConsulta: new Date().toISOString()
  };
};

module.exports = {
  obtenerResumen
};
