const posicionamientoService = require("./posicionamiento.service");

const getAllPosicionamientos = async (req, res, next) => {
  try {
    const posicionamientos = await posicionamientoService.getAllPosicionamientos();
    res.json(posicionamientos);
  } catch (error) {
    next(error);
  }
};

const getPosicionamientosByEventoId = async (req, res, next) => {
  try {
    const posicionamientos =
      await posicionamientoService.getPosicionamientosByEventoId(
        req.params.eventoId
      );
    res.json(posicionamientos);
  } catch (error) {
    next(error);
  }
};

const createPosicionamiento = async (req, res, next) => {
  try {
    const nuevoPosicionamiento =
      await posicionamientoService.createPosicionamiento(req.body);
    res.status(201).json(nuevoPosicionamiento);
  } catch (error) {
    next(error);
  }
};

const removePosicionamiento = async (req, res, next) => {
  try {
    const posicionamientoEliminado =
      await posicionamientoService.removePosicionamiento(
        req.params.eventoId,
        req.params.dotacionId,
        req.params.slotIndex
      );
    res.json(posicionamientoEliminado);
  } catch (error) {
    next(error);
  }
};

const confirmPosicionamiento = async (req, res, next) => {
  try {
    const posicionamientoActualizado =
      await posicionamientoService.confirmPosicionamiento(req.params.id);
    res.json(posicionamientoActualizado);
  } catch (error) {
    next(error);
  }
};

const replacePosicionamientoPersona = async (req, res, next) => {
  try {
    const posicionamientoActualizado =
      await posicionamientoService.replacePosicionamientoPersona(
        req.params.id,
        req.body.persona_id
      );
    res.json(posicionamientoActualizado);
  } catch (error) {
    next(error);
  }
};

const updateAsistenciaPosicionamiento = async (req, res, next) => {
  try {
    const posicionamientoActualizado =
      await posicionamientoService.updateAsistenciaPosicionamiento(
        req.params.id,
        req.body
      );
    res.json(posicionamientoActualizado);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPosicionamientos,
  getPosicionamientosByEventoId,
  createPosicionamiento,
  removePosicionamiento,
  confirmPosicionamiento,
  replacePosicionamientoPersona,
  updateAsistenciaPosicionamiento,
};
