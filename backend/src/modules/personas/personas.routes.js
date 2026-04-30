const express = require("express");
const router = express.Router();
const personasController = require("./personas.controller");

router.get("/", personasController.getAllPersonas);
router.get("/fijos", personasController.getAllPersonalFijo);
router.post("/importar", personasController.importMaestroPersonas);
router.post("/", personasController.createPersona);

module.exports = router;
