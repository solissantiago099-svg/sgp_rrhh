const personasService = require("./personas.service");

const getAllPersonas = async (req, res, next) => {
  try {
    const personas = await personasService.getAllPersonas();
    res.json(personas);
  } catch (error) {
    next(error);
  }
};

const getAllPersonalFijo = async (req, res, next) => {
  try {
    const personas = await personasService.getAllPersonalFijo();
    res.json(personas);
  } catch (error) {
    next(error);
  }
};

const createPersona = async (req, res, next) => {
  try {
    const nuevaPersona = await personasService.createPersona(req.body);
    res.status(201).json(nuevaPersona);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPersonas,
  getAllPersonalFijo,
  createPersona,
};
