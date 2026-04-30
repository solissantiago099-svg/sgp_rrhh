const express = require("express");
const cors = require("cors");
const env = require("./config/env");

const authRoutes = require("./modules/auth/auth.routes");
const usuariosRoutes = require("./modules/usuarios/usuarios.routes");
const personasRoutes = require("./modules/personas/personas.routes");
const eventosRoutes = require("./modules/eventos/eventos.routes");
const dotacionRoutes = require("./modules/dotacion/dotacion.routes");
const posicionamientoRoutes = require("./modules/posicionamiento/posicionamiento.routes");
const errorMiddleware = require("./middlewares/error.middleware");
const authMiddleware = require("./middlewares/auth.middleware");

const app = express();

// CORS restringido
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API SGP RRHH funcionando");
});

// Rutas públicas
app.use("/api/auth", authRoutes);

// Rutas protegidas - requieren autenticación
app.use("/api/usuarios", authMiddleware, usuariosRoutes);
app.use("/api/personas", authMiddleware, personasRoutes);
app.use("/api/eventos", authMiddleware, eventosRoutes);
app.use("/api/dotacion", authMiddleware, dotacionRoutes);
app.use("/api/posicionamiento", authMiddleware, posicionamientoRoutes);

app.use(errorMiddleware);

module.exports = app;