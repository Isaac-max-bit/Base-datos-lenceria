const obtenerIdValido = (valor) => {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const estadoDeError = (resultado) => {
  if (resultado.tipo === "conflicto") return 409;
  if (resultado.tipo === "no_autorizado") return 401;
  if (resultado.tipo === "servidor") return 500;
  return 400;
};

const errorInterno = (res, contexto, mensajePublico, error) => {
  console.error(`${contexto}:`, error);
  return res.status(500).json({ error: mensajePublico });
};

module.exports = { obtenerIdValido, estadoDeError, errorInterno };
