const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const usuariosRepository = require("../usuarios/usuarios.repository");
const env = require("../../config/env");

const login = async ({ username, password }) => {
  const usuario = await usuariosRepository.findByUsername(username);

  if (!usuario) {
    const error = new Error("Usuario o contraseña inválidos");
    error.status = 401;
    throw error;
  }

  const passwordValida = await bcrypt.compare(password, usuario.password);

  if (!passwordValida) {
    const error = new Error("Usuario o contraseña inválidos");
    error.status = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    message: "Login correcto",
    user: {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
    },
    token,
  };
};

module.exports = {
  login,
};