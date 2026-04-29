const express = require("express");
const router = express.Router();
const posicionamientoController = require("./posicionamiento.controller");

router.get("/", posicionamientoController.getAllPosicionamientos);
router.get("/evento/:eventoId", posicionamientoController.getPosicionamientosByEventoId);
router.post("/", posicionamientoController.createPosicionamiento);
router.patch("/:id/confirmar", posicionamientoController.confirmPosicionamiento);
router.patch("/:id/reemplazar", posicionamientoController.replacePosicionamientoPersona);
router.patch("/:id/asistencia", posicionamientoController.updateAsistenciaPosicionamiento);
router.delete(
  "/evento/:eventoId/dotacion/:dotacionId/slot/:slotIndex",
  posicionamientoController.removePosicionamiento
);

module.exports = router;
