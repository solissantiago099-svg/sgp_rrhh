const dotacionService = require("./dotacion.service");

const getAllDotaciones = async (req, res, next) => {
  try {
    const dotaciones = await dotacionService.getAllDotaciones();
    res.json(dotaciones);
  } catch (error) {
    next(error);
  }
};

const getDotacionesByEventoId = async (req, res, next) => {
  try {
    const dotaciones = await dotacionService.getDotacionesByEventoId(
      req.params.eventoId
    );
    res.json(dotaciones);
  } catch (error) {
    next(error);
  }
};

const createDotacion = async (req, res, next) => {
  try {
    const nuevaDotacion = await dotacionService.createDotacion(req.body);
    res.status(201).json(nuevaDotacion);
  } catch (error) {
    next(error);
  }
};

const updateCantidadRequerida = async (req, res, next) => {
  try {
    const dotacionActualizada = await dotacionService.updateCantidadRequerida(
      req.params.id,
      req.body.cantidad_requerida
    );
    res.json(dotacionActualizada);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDotaciones,
  getDotacionesByEventoId,
  createDotacion,
  updateCantidadRequerida,
};
