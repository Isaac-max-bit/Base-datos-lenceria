
const dashboardServicio = require("../services/dashboard.servicio");

const obtenerResumen = async (req, res) => {
  try {
    const resumen = await dashboardServicio.obtenerResumen();

    return res.status(200).json({
      success: true,
      mensaje: "Resumen del dashboard obtenido correctamente",
      data: resumen
    });

  } catch (error) {
    console.error("Error en dashboard:", error.message);

    return res.status(500).json({
      success: false,
      mensaje: "No se pudo obtener el resumen del dashboard",
      error: error.message
    });
  }
};

module.exports = {
  obtenerResumen
};
