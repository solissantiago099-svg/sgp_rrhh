const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const archivoPersonalFijo = path.join(__dirname, "../data/personal_fijo.xlsx");
const outputPath = path.join(__dirname, "../data/personal_fijo.json");

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
  const entry = Object.entries(row).find(([key]) => {
    const normalizedKey = normalizeHeader(key);
    return candidates.some((candidate) =>
      normalizedKey.includes(normalizeHeader(candidate))
    );
  });

  return entry ? clean(entry[1]) : null;
};

const buildFixedPersonaId = (cuil, index) => {
  const seed = clean(cuil) || `personal-fijo-${index + 1}`;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000000000;
  }

  return -(hash + 1);
};

const importar = () => {
  if (!fs.existsSync(archivoPersonalFijo)) {
    console.error(`No se encontro el archivo: ${archivoPersonalFijo}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(archivoPersonalFijo);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const personalFijo = rows
    .map((row, index) => {
      const cuil = getValue(row, ["c.u.i.l", "cuil"]);

      return {
        id: buildFixedPersonaId(cuil, index),
        legajo: null,
        apellido: getValue(row, ["apellido"]),
        nombre: getValue(row, ["nombre"]),
        cuil,
        categoria: "Personal fijo",
        tarea: getValue(row, ["tarea habitual", "tarea"]),
        fecha_ingreso: null,
        cbu: null,
        activo: true,
        tipo_personal: "fijo",
      };
    })
    .filter((persona) => persona.apellido && persona.nombre && persona.cuil);

  fs.writeFileSync(outputPath, JSON.stringify(personalFijo, null, 2));
  console.log(`Personal fijo importado: ${personalFijo.length}`);
  console.log(`Archivo generado: ${outputPath}`);
};

importar();
