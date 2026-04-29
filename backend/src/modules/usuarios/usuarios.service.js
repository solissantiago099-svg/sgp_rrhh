const usuariosRepository = require("./usuarios.repository");

const getAllUsuarios = async () => {
  return usuariosRepository.getAll();
};

const createUsuario = async (data) => {
  const nuevoUsuario = {
    id: Date.now(),
    username: data.username,
    password: data.password,
    nombre: data.nombre,
    apellido: data.apellido,
    rol: data.rol || "rrhh_operaciones",
    activo: data.activo ?? true,
  };

  return usuariosRepository.create(nuevoUsuario);
};

module.exports = {
  getAllUsuarios,
  createUsuario,
};