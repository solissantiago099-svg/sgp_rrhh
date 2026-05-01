const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const archivoBase = path.join(__dirname, "../data/maestro.xlsx");
const archivoCBU = path.join(__dirname, "../data/cbu.xlsx");
const outputPath = path.join(__dirname, "../data/personas.json");

const clean = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const cleanCbu = (value) => clean(value)?.replace(/^[`'´]+/, "").trim() || null;

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

const toPersona = (row, index, extra = {}) => {
  const legajo = getValue(row, ["numero de legajo", "legajo"]);

  return {
    id: Number(legajo) || Date.now() + index,
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
    cbu: cleanCbu(getValue(row, ["cbu"])) || extra.cbu || null,
    nombre_operativo:
      getValue(row, ["nombre operativo"]) || extra.nombre_operativo || null,
    activo: true,
  };
};

const importar = () => {
  console.log("Leyendo archivos...");

  const base = leerExcel(archivoBase);
  const cbuRows = leerExcel(archivoCBU);
  const cbuMap = new Map();

  cbuRows.forEach((row) => {
    const legajo = getValue(row, ["numero de legajo", "legajo"]);
    if (!legajo) return;

    cbuMap.set(String(legajo), {
      cbu: cleanCbu(getValue(row, ["cbu"])),
      nombre_operativo: getValue(row, ["nombre operativo"]),
    });
  });

  const personas = base
    .map((row, index) => {
      const legajo = getValue(row, ["numero de legajo", "legajo"]);
      return toPersona(row, index, cbuMap.get(String(legajo)) || {});
    })
    .filter((persona) => persona.legajo && persona.apellido && persona.nombre);

  cbuRows.forEach((row, index) => {
    const legajo = getValue(row, ["numero de legajo", "legajo"]);
    const yaExiste = personas.some(
      (persona) => String(persona.legajo) === String(legajo)
    );

    if (!yaExiste && legajo) {
      personas.push(toPersona(row, base.length + index));
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(personas, null, 2));

  console.log(`Personas importadas: ${personas.length}`);
  console.log(`Archivo generado: ${outputPath}`);
};

importar();
