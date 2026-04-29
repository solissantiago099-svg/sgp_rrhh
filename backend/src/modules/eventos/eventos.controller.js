const eventosService = require("./eventos.service");

const getAllEventos = async (req, res, next) => {
  try {
    const eventos = await eventosService.getAllEventos();
    res.json(eventos);
  } catch (error) {
    next(error);
  }
};

const getEventoById = async (req, res, next) => {
  try {
    const evento = await eventosService.getEventoById(req.params.id);
    res.json(evento);
  } catch (error) {
    next(error);
  }
};

const createEvento = async (req, res, next) => {
  try {
    const nuevoEvento = await eventosService.createEvento(req.body);
    res.status(201).json(nuevoEvento);
  } catch (error) {
    next(error);
  }
};

const confirmPosicionamientoEvento = async (req, res, next) => {
  try {
    const eventoActualizado =
      await eventosService.confirmPosicionamientoEvento(req.params.id);
    res.json(eventoActualizado);
  } catch (error) {
    next(error);
  }
};

const iniciarAsistenciaEvento = async (req, res, next) => {
  try {
    const eventoActualizado =
      await eventosService.iniciarAsistenciaEvento(req.params.id);
    res.json(eventoActualizado);
  } catch (error) {
    next(error);
  }
};

const importComanda = async (req, res, next) => {
  try {
    const resultado = await eventosService.importComanda(req.body);
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEventos,
  getEventoById,
  confirmPosicionamientoEvento,
  iniciarAsistenciaEvento,
  createEvento,
  importComanda,
};
