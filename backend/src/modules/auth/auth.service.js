const usuariosRepository = require("../usuarios/usuarios.repository");

const login = async ({ username, password }) => {
  const usuario = await usuariosRepository.findByUsername(username);

  if (!usuario) {
    const error = new Error("Usuario o contraseña inválidos");
    error.status = 401;
    throw error;
  }

  if (usuario.password !== password) {
    const error = new Error("Usuario o contraseña inválidos");
    error.status = 401;
    throw error;
  }

  return {
    message: "Login correcto",
    user: {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
    },
    token: "fake-jwt-token",
  };
};

module.exports = {
  login,
};