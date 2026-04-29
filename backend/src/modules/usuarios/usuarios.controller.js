const usuariosService = require("./usuarios.service");

const getAllUsuarios = async (req, res, next) => {
  try {
    const usuarios = await usuariosService.getAllUsuarios();
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
};

const createUsuario = async (req, res, next) => {
  try {
    const { username, password, nombre, apellido } = req.body;

    if (!username || !password || !nombre || !apellido) {
      return res.status(400).json({
        message: "username, password, nombre y apellido son obligatorios",
      });
    }

    const nuevoUsuario = await usuariosService.createUsuario(req.body);

    res.status(201).json(nuevoUsuario);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsuarios,
  createUsuario,
};