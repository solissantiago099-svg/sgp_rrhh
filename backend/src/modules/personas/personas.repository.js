const fs = require("fs");
const path = require("path");
const pool = require("../../config/db");

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

const normalizePersonaFromDb = (row) => ({
  ...row.data,
  id: Number(row.id),
});

const hasPersonasTable = async () => {
  const result = await pool.query(
    "SELECT to_regclass('public.personas') AS table_name"
  );
  return Boolean(result.rows[0]?.table_name);
};

const getAllFromDb = async () => {
  if (!(await hasPersonasTable())) {
    return null;
  }

  const result = await pool.query(
    "SELECT id, data FROM personas ORDER BY id ASC"
  );
  return result.rows.map(normalizePersonaFromDb);
};

const seedDbFromFileIfEmpty = async () => {
  if (!(await hasPersonasTable())) {
    return;
  }

  const countResult = await pool.query(
    "SELECT COUNT(*)::int AS total FROM personas"
  );
  if (countResult.rows[0]?.total > 0) {
    return;
  }

  const personas = readPersonasFile();
  if (personas.length === 0) {
    return;
  }

  await replaceAllInDb(personas);
};

const replaceAllInDb = async (personas) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE personas");

    for (const persona of personas) {
      await client.query(
        `
          INSERT INTO personas (id, data, updated_at)
          VALUES ($1, $2, NOW())
        `,
        [Number(persona.id), persona]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getAll = async () => {
  await seedDbFromFileIfEmpty();
  const personas = await getAllFromDb();

  if (personas) {
    return personas;
  }

  return readPersonasFile();
};

const getAllFijos = async () => {
  return readPersonalFijoFile();
};

const getAllForPosicionamiento = async () => {
  return [...(await getAll()), ...readPersonalFijoFile()];
};

const getByLegajo = async (legajo) => {
  const personas = await getAll();
  return personas.find((persona) => String(persona.legajo) === String(legajo));
};

const getByCuil = async (cuil) => {
  const personas = await getAll();
  return personas.find((persona) => persona.cuil === cuil);
};

const getById = async (id) => {
  const personas = [...(await getAll()), ...readPersonalFijoFile()];
  return personas.find((persona) => Number(persona.id) === Number(id));
};

const create = async (persona) => {
  const personas = await getAll();
  personas.push(persona);
  await replaceAll(personas);
  return persona;
};

const replaceAll = async (personas) => {
  if (await hasPersonasTable()) {
    await replaceAllInDb(personas);
  } else {
    writePersonasFile(personas);
  }

  return personas;
};

module.exports = {
  getAll,
  getAllFijos,
  getAllForPosicionamiento,
  getByLegajo,
  getByCuil,
  getById,
  create,
  replaceAll,
};
