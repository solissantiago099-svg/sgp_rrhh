const usuarios = [
  {
    id: 1,
    username: "admin",
    password: "1234",
    nombre: "Admin",
    apellido: "Sistema",
    rol: "admin",
    activo: true,
  },
];

const getAll = async () => {
  return usuarios;
};

const findByUsername = async (username) => {
  return usuarios.find(
    (usuario) => usuario.username === username && usuario.activo
  );
};

const create = async (usuario) => {
  usuarios.push(usuario);
  return usuario;
};

module.exports = {
  getAll,
  findByUsername,
  create,
};