const personasRepository = require("./personas.repository");

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const normalizeBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null) return defaultValue;
  return Boolean(value);
};

const buildEstadoBancario = ({ cbu, banco, estado_bancario }) => {
  const estadoManual = normalizeText(estado_bancario);

  if (estadoManual) {
    return estadoManual.toLowerCase();
  }

  if (!cbu || !banco || banco.toLowerCase() === "pendiente") {
    return "pendiente";
  }

  return "completo";
};

const getAllPersonas = async () => {
  return personasRepository.getAll();
};

const getAllPersonalFijo = async () => {
  return personasRepository.getAllFijos();
};

const getAllPersonasForPosicionamiento = async () => {
  return personasRepository.getAllForPosicionamiento();
};

const createPersona = async (data) => {
  const legajo = normalizeText(data.legajo);
  const apellido = normalizeText(data.apellido);
  const nombre = normalizeText(data.nombre);
  const cuil = normalizeText(data.cuil);

  if (!legajo || !apellido || !nombre || !cuil) {
    const error = new Error("legajo, apellido, nombre y cuil son obligatorios");
    error.status = 400;
    throw error;
  }

  const personaByLegajo = await personasRepository.getByLegajo(legajo);
  if (personaByLegajo) {
    const error = new Error("Ya existe una persona con ese legajo");
    error.status = 400;
    throw error;
  }

  const personaByCuil = await personasRepository.getByCuil(cuil);
  if (personaByCuil) {
    const error = new Error("Ya existe una persona con ese CUIL");
    error.status = 400;
    throw error;
  }

  const cbu = normalizeText(data.cbu);
  const banco = normalizeText(data.banco);

  const nuevaPersona = {
    id: Date.now(),
    legajo,
    apellido,
    nombre,
    cuil,
    fecha_ingreso: normalizeText(data.fecha_ingreso),
    fecha_egreso: normalizeText(data.fecha_egreso),
    categoria: normalizeText(data.categoria),
    grupo_jerarquico: normalizeText(data.grupo_jerarquico),
    tarea_habitual: normalizeText(data.tarea_habitual),
    cbu,
    banco,
    estado_bancario: buildEstadoBancario({
      cbu,
      banco,
      estado_bancario: data.estado_bancario,
    }),
    telefono: normalizeText(data.telefono),
    activo: normalizeBoolean(data.activo, true),
  };

  return personasRepository.create(nuevaPersona);
};

const getPersonaById = async (id) => {
  const persona = await personasRepository.getById(id);

  if (!persona) {
    const error = new Error("Persona no encontrada");
    error.status = 404;
    throw error;
  }

  return persona;
};

module.exports = {
  getAllPersonas,
  getAllPersonalFijo,
  getAllPersonasForPosicionamiento,
  createPersona,
  getPersonaById,
};
