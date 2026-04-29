const fs = require("fs");
const path = require("path");

const personasPath = path.join(__dirname, "../../../data/personas.json");
const personalFijoPath = path.join(__dirname, "../../../data/personal_fijo.json");

const readJsonFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
};

const readPersonasFile = () => readJsonFile(personasPath);

const readPersonalFijoFile = () => readJsonFile(personalFijoPath);

const writePersonasFile = (personas) => {
  fs.writeFileSync(personasPath, JSON.stringify(personas, null, 2));
};

const getAll = async () => {
  return readPersonasFile();
};

const getAllFijos = async () => {
  return readPersonalFijoFile();
};

const getAllForPosicionamiento = async () => {
  return [...readPersonasFile(), ...readPersonalFijoFile()];
};

const getByLegajo = async (legajo) => {
  const personas = readPersonasFile();
  return personas.find((persona) => String(persona.legajo) === String(legajo));
};

const getByCuil = async (cuil) => {
  const personas = readPersonasFile();
  return personas.find((persona) => persona.cuil === cuil);
};

const getById = async (id) => {
  const personas = [...readPersonasFile(), ...readPersonalFijoFile()];
  return personas.find((persona) => Number(persona.id) === Number(id));
};

const create = async (persona) => {
  const personas = readPersonasFile();
  personas.push(persona);
  writePersonasFile(personas);
  return persona;
};

module.exports = {
  getAll,
  getAllFijos,
  getAllForPosicionamiento,
  getByLegajo,
  getByCuil,
  getById,
  create,
};
