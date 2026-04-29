const express = require("express");
const router = express.Router();
const usuariosController = require("./usuarios.controller");

router.get("/", usuariosController.getAllUsuarios);
router.post("/", usuariosController.createUsuario);

module.exports = router;