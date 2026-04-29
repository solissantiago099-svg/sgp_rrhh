const authService = require("./auth.service");

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "username y password son obligatorios",
      });
    }

    const result = await authService.login({ username, password });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
};