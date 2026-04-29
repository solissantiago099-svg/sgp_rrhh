const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");
const usuariosRoutes = require("./modules/usuarios/usuarios.routes");
const personasRoutes = require("./modules/personas/personas.routes");
const eventosRoutes = require("./modules/eventos/eventos.routes");
const dotacionRoutes = require("./modules/dotacion/dotacion.routes");
const posicionamientoRoutes = require("./modules/posicionamiento/posicionamiento.routes");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API SGP RRHH funcionando");
});

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/personas", personasRoutes);
app.use("/api/eventos", eventosRoutes);
app.use("/api/dotacion", dotacionRoutes);
app.use("/api/posicionamiento", posicionamientoRoutes);

app.use(errorMiddleware);

module.exports = app;