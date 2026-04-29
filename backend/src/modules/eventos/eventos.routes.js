const express = require("express");
const router = express.Router();
const eventosController = require("./eventos.controller");

router.get("/", eventosController.getAllEventos);
router.post("/importar", eventosController.importComanda);
router.get("/:id", eventosController.getEventoById);
router.patch("/:id/confirmar-posicionamiento", eventosController.confirmPosicionamientoEvento);
router.patch("/:id/iniciar-asistencia", eventosController.iniciarAsistenciaEvento);
router.post("/", eventosController.createEvento);

module.exports = router;
