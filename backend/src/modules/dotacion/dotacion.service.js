const dotacionRepository = require("./dotacion.repository");
const eventosService = require("../eventos/eventos.service");
const posicionamientoRepository = require("../posicionamiento/posicionamiento.repository");

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const getAllDotaciones = async () => {
  return dotacionRepository.getAll();
};

const getDotacionesByEventoId = async (eventoId) => {
  await eventosService.getEventoById(eventoId);
  return dotacionRepository.getByEventoId(eventoId);
};

const getDotacionById = async (id) => {
  const dotacion = await dotacionRepository.getById(id);

  if (!dotacion) {
    const error = new Error("Dotación no encontrada");
    error.status = 404;
    throw error;
  }

  return dotacion;
};

const createDotacion = async (data, client) => {
  const evento_id = normalizeNumber(data.evento_id);
  const puesto = normalizeText(data.puesto);
  const cantidad_requerida = normalizeNumber(data.cantidad_requerida);
  const cantidad_base =
    normalizeNumber(data.cantidad_base) ?? cantidad_requerida;

  if (!evento_id || !puesto || !cantidad_requerida) {
    const error = new Error(
      "evento_id, puesto y cantidad_requerida son obligatorios"
    );
    error.status = 400;
    throw error;
  }

  if (cantidad_base > cantidad_requerida) {
    const error = new Error(
      "cantidad_base no puede ser mayor a cantidad_requerida"
    );
    error.status = 400;
    throw error;
  }

  await eventosService.getEventoById(evento_id);

  return dotacionRepository.create(
    {
      evento_id,
      puesto,
      cantidad_base,
      cantidad_requerida,
      hora_ingreso: normalizeText(data.hora_ingreso),
      hora_egreso: normalizeText(data.hora_egreso),
      jornada_horas: normalizeNumber(data.jornada_horas),
    },
    client
  );
};

const updateCantidadRequerida = async (id, cantidadRequerida) => {
  const dotacion = await getDotacionById(id);
  const nuevaCantidad = normalizeNumber(cantidadRequerida);

  if (nuevaCantidad === null) {
    const error = new Error("cantidad_requerida es obligatoria");
    error.status = 400;
    throw error;
  }

  if (nuevaCantidad < dotacion.cantidad_base) {
    const error = new Error(
      "No se puede bajar la cantidad requerida por debajo del cupo base"
    );
    error.status = 400;
    throw error;
  }

  const slotLimit = nuevaCantidad - 1;
  const highestOccupiedSlot = await posicionamientoRepository.getByEventoId(
    dotacion.evento_id
  );
  const highestDotacionSlot = highestOccupiedSlot
    .filter((item) => item.dotacion_id === dotacion.id)
    .reduce((maxSlot, item) => Math.max(maxSlot, item.slot_index), -1);

  if (highestDotacionSlot > slotLimit) {
    const error = new Error(
      "No se puede reducir la dotación porque hay personal asignado en cupos extra"
    );
    error.status = 400;
    throw error;
  }

  return dotacionRepository.updateCantidadRequerida(id, nuevaCantidad);
};

module.exports = {
  getAllDotaciones,
  getDotacionesByEventoId,
  getDotacionById,
  createDotacion,
  updateCantidadRequerida,
};
