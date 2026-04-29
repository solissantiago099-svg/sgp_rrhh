const express = require("express");
const router = express.Router();
const dotacionController = require("./dotacion.controller");

router.get("/", dotacionController.getAllDotaciones);
router.get("/evento/:eventoId", dotacionController.getDotacionesByEventoId);
router.post("/", dotacionController.createDotacion);
router.patch("/:id", dotacionController.updateCantidadRequerida);

module.exports = router;
