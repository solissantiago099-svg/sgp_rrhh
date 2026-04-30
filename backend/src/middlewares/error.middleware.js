const errorMiddleware = (err, req, res, next) => {
  const env = require("../config/env");

  // Log del error
  if (env.NODE_ENV === "development") {
    console.error("Error:", err);
  }

  // Manejo de diferentes tipos de errores
  const status = err.status || 500;
  const message = err.message || "Error interno del servidor";

  // Evitar exponer detalles internos en producción
  const errorResponse = {
    message,
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  };

  res.status(status).json(errorResponse);
};

module.exports = errorMiddleware;