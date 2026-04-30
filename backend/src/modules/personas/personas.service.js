const XLSX = require("xlsx");
const personasRepository = require("./personas.repository");

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const normalizeBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null) return defaultValue;
  return Boolean(value);
};

const normalizeHeader = (value) =>
  normalizeText(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "";

const getValue = (row, candidates) => {
  const normalizedCandidates = candidates.map((candidate) =>
    normalizeHeader(candidate)
  );

  const entry = Object.entries(row).find(([key]) => {
    const normalizedKey = normalizeHeader(key);
    return normalizedCandidates.some((candidate) =>
      normalizedKey.includes(candidate)
    );
  });

  return entry ? normalizeText(entry[1]) : null;
};

const toIsoDate = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = normalizeText(value);
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const excelSerial = Number(text);
  if (!Number.isNaN(excelSerial) && excelSerial > 20000) {
    const parsed = XLSX.SSF.parse_date_code(excelSerial);
    if (parsed) {
      return `${String(parsed.y).padStart(4, "0")}-${String(parsed.m).padStart(
        2,
        "0"
      )}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return text;
};

const buildPersonaFromMaestroRow = (row, index) => {
  const legajo = normalizeText(
    getValue(row, ["numero de legajo", "legajo"])
  );
  const cuil = normalizeText(getValue(row, ["c.u.i.l", "cuil"]));

  return {
    id: Number(legajo) || Date.now() + index,
    legajo: Number(legajo) || legajo,
    apellido: getValue(row, ["apellido"]),
    nombre: getValue(row, ["nombre"]),
    cuil,
    categoria: getValue(row, ["descripcion de categoria", "categoria"]),
    grupo_jerarquico: getValue(row, [
      "descripcion de grupo jerarquico",
      "grupo jerarquico",
    ]),
    tarea: getValue(row, ["tarea habitual", "tarea"]),
    fecha_ingreso: toIsoDate(getValue(row, ["fecha de ingreso", "ingreso"])),
    cbu: null,
    activo: true,
  };
};

const mergeImportedPersonas = (currentPersonas, importedPersonas) => {
  const currentByLegajo = new Map(
    currentPersonas
      .filter((persona) => persona.legajo !== null && persona.legajo !== undefined)
      .map((persona) => [String(persona.legajo), persona])
  );
  const currentByCuil = new Map(
    currentPersonas
      .filter((persona) => persona.cuil)
      .map((persona) => [String(persona.cuil), persona])
  );
  const mergedImported = importedPersonas.map((importedPersona) => {
    const current =
      currentByLegajo.get(String(importedPersona.legajo)) ||
      currentByCuil.get(String(importedPersona.cuil)) ||
      null;

    return {
      ...current,
      ...importedPersona,
      id: current?.id ?? importedPersona.id,
      cbu: current?.cbu ?? null,
      banco: current?.banco ?? null,
      estado_bancario:
        current?.estado_bancario ??
        buildEstadoBancario({
          cbu: current?.cbu,
          banco: current?.banco,
          estado_bancario: current?.estado_bancario,
        }),
      telefono: current?.telefono ?? null,
      activo: true,
    };
  });

  const inactiveMissing = currentPersonas
    .filter((currentPersona) => {
      const matchingImport = importedPersonas.some(
        (importedPersona) =>
          String(importedPersona.legajo) === String(currentPersona.legajo) ||
          (importedPersona.cuil && importedPersona.cuil === currentPersona.cuil)
      );

      return !matchingImport;
    })
    .map((currentPersona) => ({
      ...currentPersona,
      activo: false,
    }));

  return [...mergedImported, ...inactiveMissing].sort((a, b) => {
    const legajoA = Number(a.legajo);
    const legajoB = Number(b.legajo);
    if (!Number.isNaN(legajoA) && !Number.isNaN(legajoB)) {
      return legajoA - legajoB;
    }
    return String(a.apellido || "").localeCompare(String(b.apellido || ""));
  });
};

const buildEstadoBancario = ({ cbu, banco, estado_bancario }) => {
  const estadoManual = normalizeText(estado_bancario);

  if (estadoManual) {
    return estadoManual.toLowerCase();
  }

  if (!cbu || !banco || banco.toLowerCase() === "pendiente") {
    return "pendiente";
  }

  return "completo";
};

const getAllPersonas = async () => {
  return personasRepository.getAll();
};

const getAllPersonalFijo = async () => {
  return personasRepository.getAllFijos();
};

const getAllPersonasForPosicionamiento = async () => {
  return personasRepository.getAllForPosicionamiento();
};

const createPersona = async (data) => {
  const legajo = normalizeText(data.legajo);
  const apellido = normalizeText(data.apellido);
  const nombre = normalizeText(data.nombre);
  const cuil = normalizeText(data.cuil);

  if (!legajo || !apellido || !nombre || !cuil) {
    const error = new Error("legajo, apellido, nombre y cuil son obligatorios");
    error.status = 400;
    throw error;
  }

  const personaByLegajo = await personasRepository.getByLegajo(legajo);
  if (personaByLegajo) {
    const error = new Error("Ya existe una persona con ese legajo");
    error.status = 400;
    throw error;
  }

  const personaByCuil = await personasRepository.getByCuil(cuil);
  if (personaByCuil) {
    const error = new Error("Ya existe una persona con ese CUIL");
    error.status = 400;
    throw error;
  }

  const cbu = normalizeText(data.cbu);
  const banco = normalizeText(data.banco);

  const nuevaPersona = {
    id: Date.now(),
    legajo,
    apellido,
    nombre,
    cuil,
    fecha_ingreso: normalizeText(data.fecha_ingreso),
    fecha_egreso: normalizeText(data.fecha_egreso),
    categoria: normalizeText(data.categoria),
    grupo_jerarquico: normalizeText(data.grupo_jerarquico),
    tarea_habitual: normalizeText(data.tarea_habitual),
    cbu,
    banco,
    estado_bancario: buildEstadoBancario({
      cbu,
      banco,
      estado_bancario: data.estado_bancario,
    }),
    telefono: normalizeText(data.telefono),
    activo: normalizeBoolean(data.activo, true),
  };

  return personasRepository.create(nuevaPersona);
};

const importMaestroPersonas = async ({ fileName, fileContentBase64 }) => {
  if (!normalizeText(fileName) || !fileContentBase64) {
    const error = new Error("fileName y fileContentBase64 son obligatorios");
    error.status = 400;
    throw error;
  }

  let workbook;

  try {
    const buffer = Buffer.from(fileContentBase64, "base64");
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
    });
  } catch {
    const error = new Error("No se pudo leer el archivo de personal");
    error.status = 400;
    throw error;
  }

  const sheetName =
    workbook.SheetNames.find((name) => normalizeHeader(name) === "ficha") ||
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
  });

  const importedPersonas = rows
    .map(buildPersonaFromMaestroRow)
    .filter(
      (persona) =>
        persona.legajo && persona.apellido && persona.nombre && persona.cuil
    );

  if (importedPersonas.length === 0) {
    const error = new Error(
      "No se encontraron personas validas en el archivo importado"
    );
    error.status = 400;
    throw error;
  }

  const currentPersonas = await personasRepository.getAll();
  const mergedPersonas = mergeImportedPersonas(currentPersonas, importedPersonas);
  await personasRepository.replaceAll(mergedPersonas);

  const activeCount = mergedPersonas.filter((persona) => persona.activo).length;
  const inactiveCount = mergedPersonas.length - activeCount;

  return {
    importedCount: importedPersonas.length,
    totalCount: mergedPersonas.length,
    activeCount,
    inactiveCount,
  };
};

const getPersonaById = async (id) => {
  const persona = await personasRepository.getById(id);

  if (!persona) {
    const error = new Error("Persona no encontrada");
    error.status = 404;
    throw error;
  }

  return persona;
};

module.exports = {
  getAllPersonas,
  getAllPersonalFijo,
  getAllPersonasForPosicionamiento,
  createPersona,
  importMaestroPersonas,
  getPersonaById,
};
