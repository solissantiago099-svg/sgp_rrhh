const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const archivoBase = path.join(__dirname, "../data/maestro.xlsx");
const outputPath = path.join(__dirname, "../data/personas.json");

const clean = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const normalizeHeader = (value) =>
  clean(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "";

const getValue = (row, candidates) => {
  const normalizedCandidates = candidates.map(normalizeHeader);
  const entry = Object.entries(row).find(([key]) => {
    const normalizedKey = normalizeHeader(key);
    return normalizedCandidates.some((candidate) =>
      normalizedKey.includes(candidate)
    );
  });

  return entry ? clean(entry[1]) : null;
};

const leerExcel = (ruta) => {
  if (!fs.existsSync(ruta)) return [];

  const workbook = XLSX.readFile(ruta, { cellDates: true });
  const sheetName =
    workbook.SheetNames.find((name) => normalizeHeader(name) === "ficha") ||
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
  });
};

const leerPersonasExistentes = () => {
  if (!fs.existsSync(outputPath)) return [];

  try {
    const data = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const toPersona = (row, index, existente = null) => {
  const legajo = getValue(row, ["numero de legajo", "legajo"]);

  return {
    id: existente?.id ?? (Number(legajo) || Date.now() + index),
    legajo: Number(legajo) || legajo,
    apellido: getValue(row, ["apellido"]),
    nombre: getValue(row, ["nombre"]),
    cuil: getValue(row, ["c.u.i.l", "cuil"]),
    categoria: getValue(row, ["descripcion de categoria", "categoria"]),
    grupo_jerarquico: getValue(row, [
      "descripcion de grupo jerarquico",
      "grupo jerarquico",
    ]),
    tarea: getValue(row, ["tarea habitual", "tarea"]),
    fecha_ingreso: getValue(row, ["fecha de ingreso", "ingreso"]),
    cbu: existente?.cbu ?? null,
    nombre_operativo: existente?.nombre_operativo ?? null,
    activo: true,
  };
};

const importar = () => {
  console.log("Leyendo archivos...");

  const base = leerExcel(archivoBase);
  const existentes = leerPersonasExistentes();
  const existentePorLegajo = new Map(
    existentes
      .filter(
        (persona) => persona.legajo !== null && persona.legajo !== undefined
      )
      .map((persona) => [String(persona.legajo), persona])
  );
  const existentePorCuil = new Map(
    existentes
      .filter((persona) => persona.cuil)
      .map((persona) => [String(persona.cuil), persona])
  );

  const personas = base
    .map((row, index) => {
      const legajo = getValue(row, ["numero de legajo", "legajo"]);
      const cuil = getValue(row, ["c.u.i.l", "cuil"]);
      const existente =
        existentePorLegajo.get(String(legajo)) ||
        existentePorCuil.get(String(cuil)) ||
        null;

      return toPersona(row, index, existente);
    })
    .filter((persona) => persona.legajo && persona.apellido && persona.nombre);

  fs.writeFileSync(outputPath, JSON.stringify(personas, null, 2));

  console.log(`Personas importadas: ${personas.length}`);
  console.log(`Archivo generado: ${outputPath}`);
};

importar();
