const app = require("./app");
const env = require("./config/env");
const { ensureDbSchema } = require("./config/init-db");

const startServer = async () => {
  await ensureDbSchema();

  app.listen(env.PORT, () => {
    console.log(`Servidor corriendo en puerto ${env.PORT}`);
  });
};

startServer().catch((error) => {
  console.error("No se pudo iniciar el servidor:", error);
  process.exit(1);
});
