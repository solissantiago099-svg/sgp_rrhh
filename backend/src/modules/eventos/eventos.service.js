const XLSX = require("xlsx");
const pool = require("../../config/db");
const eventosRepository = require("./eventos.repository");
const dotacionRepository = require("../dotacion/dotacion.repository");

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isNaN(number) ? null : number;
};

const normalizeHeader = (value) =>
  normalizeText(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "";

const toIsoDate = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = normalizeText(value);
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
};

const sheetToMatrix = (sheet) =>
  XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });

const normalizeMatrixCell = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const rowToText = (row) =>
  row.map((cell) => normalizeMatrixCell(cell)).join(" | ").toLowerCase();

const findColumnIndex = (row, candidates) => {
  const normalizedCandidates = candidates.map((candidate) =>
    normalizeHeader(candidate)
  );

  return row.findIndex((cell) => {
    const normalizedCell = normalizeHeader(cell);
    if (!normalizedCell) return false;

    return normalizedCandidates.some((candidate) =>
      normalizedCell.includes(candidate)
    );
  });
};

const findRowIndexContaining = (matrix, text) => {
  const needle = text.toLowerCase();

  return matrix.findIndex((row) => rowToText(row).includes(needle));
};

const getCellValueNearLabel = (matrix, possibleLabels) => {
  for (const label of possibleLabels) {
    const rowIndex = findRowIndexContaining(matrix, label);

    if (rowIndex === -1) continue;

    const row = matrix[rowIndex];

    for (let i = 0; i < row.length; i += 1) {
      const cell = normalizeMatrixCell(row[i]).toLowerCase();

      if (cell.includes(label.toLowerCase())) {
        // buscar hacia la derecha
        for (let j = i + 1; j < row.length; j += 1) {
          const candidate = normalizeMatrixCell(row[j]);
          if (candidate) return candidate;
        }

        // o hacia abajo
        if (matrix[rowIndex + 1]) {
          const below = normalizeMatrixCell(matrix[rowIndex + 1][i]);
          if (below) return below;

          for (let j = i + 1; j < matrix[rowIndex + 1].length; j += 1) {
            const candidate = normalizeMatrixCell(matrix[rowIndex + 1][j]);
            if (candidate) return candidate;
          }
        }
      }
    }
  }

  return null;
};

const parseExcelDate = (value) => {
  if (!value) return null;

  const text = normalizeText(value);
  if (!text) return null;

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return toIsoDate(text);
};

const parseTimeText = (value) => {
  if (!value) return null;

  const text = normalizeText(value);
  if (!text) return null;

  const match = text.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : text;
};

const parseHoursNumber = (value) => {
  if (value === undefined || value === null) return null;

  const text = normalizeText(value);
  if (!text) return null;

  const number = Number(text.replace(",", "."));
  return Number.isNaN(number) ? null : number;
};

const isCamareroPuesto = (puesto) => normalizeHeader(puesto).includes("camarero");

const isElaboracionPuesto = (puesto) =>
  normalizeHeader(puesto).includes("elaboracion");

const isCamareroArmadoPuesto = (puesto) => {
  const normalized = normalizeHeader(puesto);
  return normalized.includes("camarero") && normalized.includes("armado");
};

const getExplicitCamareroTurnoLabel = (puesto) => {
  const normalized = normalizeHeader(puesto);

  if (
    normalized.includes("1er_turno") ||
    normalized.includes("1_turno") ||
    normalized.includes("primer_turno")
  ) {
    return "Camarero 1er turno";
  }

  if (
    normalized.includes("2do_turno") ||
    normalized.includes("2_turno") ||
    normalized.includes("segundo_turno")
  ) {
    return "Camarero 2do turno";
  }

  if (
    normalized.includes("3er_turno") ||
    normalized.includes("3_turno") ||
    normalized.includes("tercer_turno")
  ) {
    return "Camarero 3er turno";
  }

  return null;
};

const getCamareroTurnoLabel = (index) => {
  const turnos = ["1er", "2do", "3er"];
  return `Camarero ${turnos[index] || `${index + 1}to`} turno`;
};

const groupCamareroDotacionesByTurno = (dotaciones) => {
  const groupedByHorario = new Map();
  const groupedItems = new Set();
  const result = [];

  dotaciones.forEach((dotacion) => {
    if (!isCamareroPuesto(dotacion.puesto) || isCamareroArmadoPuesto(dotacion.puesto)) {
      result.push(dotacion);
      return;
    }

    const horarioKey = [
      dotacion.hora_ingreso || "",
      dotacion.hora_egreso || "",
      dotacion.jornada_horas ?? "",
    ].join("|");

    let group = groupedByHorario.get(horarioKey);

    if (!group) {
      group = {
        ...dotacion,
        puesto: getExplicitCamareroTurnoLabel(dotacion.puesto),
      };
      groupedByHorario.set(horarioKey, group);
      groupedItems.add(group);
      result.push(group);
    } else {
      group.cantidad_base += dotacion.cantidad_base;
      group.cantidad_requerida += dotacion.cantidad_requerida;

      if (!group.puesto) {
        group.puesto = getExplicitCamareroTurnoLabel(dotacion.puesto);
      }
    }
  });

  let turnoIndex = 0;

  return result.map((dotacion) => {
    if (!groupedItems.has(dotacion)) {
      return dotacion;
    }

    const puesto = dotacion.puesto || getCamareroTurnoLabel(turnoIndex);
    turnoIndex += 1;

    return {
      ...dotacion,
      puesto,
    };
  });
};

const isPersonalRow = (row) => {
  const puesto = normalizeMatrixCell(row[0]);
  const cantidad = normalizeMatrixCell(row[1]);

  if (!puesto || !cantidad) return false;

  const puestoLower = puesto.toLowerCase();

  if (
    puestoLower.includes("personal") ||
    puestoLower.includes("puesto") ||
    puestoLower.includes("totales") ||
    puestoLower.includes("total")
  ) {
    return false;
  }

  const cantidadNumero = Number(String(cantidad).replace(",", "."));
  return !Number.isNaN(cantidadNumero) && cantidadNumero > 0;
};

// Función principal para parsear la comanda desde la hoja de Excel//

const parseRealComanda = (sheet) => {
  const matrix = sheetToMatrix(sheet);

  const get = (rowIndex, colIndex) =>
    normalizeMatrixCell(matrix[rowIndex]?.[colIndex]);

  const salon = normalizeText(get(0, 2)) || null;
  const subtipo_salon = normalizeText(get(1, 2)) || null;
  const tipo_evento = normalizeText(get(2, 2)) || null;
  const fecha_raw = normalizeText(get(3, 2)) || null;
  const cliente_evento = normalizeText(get(4, 2)) || null;
  const inicio_raw = normalizeText(get(5, 2)) || null;

  const fecha_evento = parseExcelDate(fecha_raw);

  let hora_inicio = null;
  let hora_fin = null;

  if (inicio_raw) {
    const match = inicio_raw.match(/Inicio:\s*(\d{1,2}:\d{2})\s*a\s*(\d{1,2}:\d{2})/i);
    if (match) {
      hora_inicio = match[1];
      hora_fin = match[2];
    }
  }

  const personalRowIndex = findRowIndexContaining(matrix, "personal");

  if (personalRowIndex === -1) {
    const error = new Error(
      "No se encontró la sección PERSONAL en la comanda"
    );
    error.status = 400;
    throw error;
  }

let detalleHeaderRowIndex = -1;

for (let i = personalRowIndex; i < matrix.length; i++) {
  const row = matrix[i];
  const text = rowToText(row);

  if (
    text.includes("nombre del puesto") &&
    text.includes("cantidad")
  ) {
    detalleHeaderRowIndex = i;
    break;
  }
}

if (detalleHeaderRowIndex === -1) {
  const error = new Error(
    "No se encontró el encabezado del bloque PERSONAL en la comanda"
  );
  error.status = 400;
  throw error;
}

  const dotaciones = [];
  const detalleHeaderRow = matrix[detalleHeaderRowIndex] || [];
  const puestoColumnIndex = findColumnIndex(detalleHeaderRow, [
    "nombre del puesto",
    "puesto",
  ]);
  const cantidadColumnIndex = findColumnIndex(detalleHeaderRow, [
    "cantidad",
    "cant",
  ]);
  const ingresoColumnIndex = findColumnIndex(detalleHeaderRow, [
    "hora ingreso",
    "ingreso",
  ]);
  const egresoColumnIndex = findColumnIndex(detalleHeaderRow, [
    "hora egreso",
    "egreso",
    "salida",
  ]);
  const jornadaColumnIndex = findColumnIndex(detalleHeaderRow, [
    "jornada horas",
    "jornada",
    "horas",
  ]);

  if (puestoColumnIndex === -1 || cantidadColumnIndex === -1) {
    const error = new Error(
      "No se pudieron identificar las columnas Puesto y Cantidad en el bloque PERSONAL"
    );
    error.status = 400;
    throw error;
  }

  for (let i = detalleHeaderRowIndex + 1; i < matrix.length; i += 1) {
    const row = matrix[i];

    if (!row || row.every((cell) => !normalizeMatrixCell(cell))) {
      if (dotaciones.length > 0) break;
      continue;
    }

    const puesto = normalizeText(row[puestoColumnIndex]);
    const cantidad = normalizeNumber(row[cantidadColumnIndex]);
    const hora_ingreso =
      ingresoColumnIndex === -1 ? null : parseTimeText(row[ingresoColumnIndex]);
    const hora_egreso =
      egresoColumnIndex === -1 ? null : parseTimeText(row[egresoColumnIndex]);
    const jornada_horas =
      jornadaColumnIndex === -1 ? null : parseHoursNumber(row[jornadaColumnIndex]);

    if (!puesto && !cantidad) {
      if (dotaciones.length > 0) break;
      continue;
    }

    if (!puesto || !cantidad || cantidad <= 0) {
      continue;
    }

    if (isElaboracionPuesto(puesto)) {
      continue;
    }

    dotaciones.push({
      puesto,
      cantidad_base: cantidad,
      cantidad_requerida: cantidad,
      hora_ingreso,
      hora_egreso,
      jornada_horas,
    });
  }

  if (!cliente_evento || !salon || !fecha_evento) {
    const error = new Error(
      "No se pudo obtener cliente, salón o fecha desde la cabecera de la comanda"
    );
    error.status = 400;
    throw error;
  }

  if (dotaciones.length === 0) {
    const error = new Error(
      "No se encontraron filas válidas dentro de la sección PERSONAL"
    );
    error.status = 400;
    throw error;
  }

  return {
    nombre_evento: `${cliente_evento} - ${salon}`,
    fecha_evento,
    salon,
    cliente_evento,
    tipo_evento,
    hora_inicio,
    hora_fin,
    subtipo_salon,
    unidad_imputacion: null,
    pagador_real: "SGP",
    estado: "pendiente",
    dotaciones: groupCamareroDotacionesByTurno(dotaciones),
  };
};

const getAllEventos = async () => {
  return eventosRepository.getAll();
};

const getEventoById = async (id) => {
  const evento = await eventosRepository.getById(Number(id));

  if (!evento) {
    const error = new Error("Evento no encontrado");
    error.status = 404;
    throw error;
  }

  return evento;
};

const confirmPosicionamientoEvento = async (id) => {
  await getEventoById(id);

  const dotaciones = await dotacionRepository.getByEventoId(id);
  const totalRequerido = dotaciones.reduce(
    (total, dotacion) => total + dotacion.cantidad_requerida,
    0
  );
  const totalFaltante = dotaciones.reduce(
    (total, dotacion) => total + dotacion.cantidad_faltante,
    0
  );

  if (dotaciones.length === 0 || totalRequerido === 0) {
    const error = new Error(
      "No se puede confirmar un posicionamiento sin dotaciones cargadas"
    );
    error.status = 400;
    throw error;
  }

  if (totalFaltante > 0) {
    const error = new Error(
      "No se puede confirmar el posicionamiento hasta completar todos los slots"
    );
    error.status = 400;
    throw error;
  }

  return eventosRepository.updateEstado(id, "convocatoria");
};

const iniciarAsistenciaEvento = async (id) => {
  await getEventoById(id);
  return eventosRepository.updateEstado(id, "asistencia");
};

const reabrirPosicionamientoEvento = async (id) => {
  await getEventoById(id);
  return eventosRepository.updateEstado(id, "pendiente");
};

const createEvento = async (data, client = pool) => {
  const nombre_evento = normalizeText(data.nombre_evento);
  const fecha_evento = toIsoDate(data.fecha_evento);
  const salon = normalizeText(data.salon);
  const cliente_evento = normalizeText(data.cliente_evento);

  if (!nombre_evento || !fecha_evento || !salon || !cliente_evento) {
    const error = new Error(
      "nombre_evento, fecha_evento, salon y cliente_evento son obligatorios"
    );
    error.status = 400;
    throw error;
  }

  const nuevoEvento = {
    nombre_evento,
    fecha_evento,
    salon,
    cliente_evento,
    unidad_imputacion: normalizeText(data.unidad_imputacion),
    pagador_real: normalizeText(data.pagador_real) || "SGP",
    estado: normalizeText(data.estado) || "pendiente",
  };

  return eventosRepository.create(nuevoEvento, client);
};

const importComanda = async ({ fileName, fileContentBase64 }) => {
  const normalizedFileName = normalizeText(fileName);

  if (!normalizedFileName || !fileContentBase64) {
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
  } catch (parseError) {
    const error = new Error("No se pudo leer el archivo de comanda");
    error.status = 400;
    throw error;
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    const error = new Error("El archivo no contiene hojas para importar");
    error.status = 400;
    throw error;
  }

  const sheet = workbook.Sheets[firstSheetName];
  const importedEvent = parseRealComanda(sheet);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const createdEvent = await createEvento(importedEvent, client);

    for (const dotacion of importedEvent.dotaciones) {
      await dotacionRepository.create(
        {
          evento_id: createdEvent.id,
          ...dotacion,
        },
        client
      );
    }

    await client.query("COMMIT");

    return {
      importedCount: 1,
      eventos: [createdEvent],
      fileName: normalizedFileName,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getAllEventos,
  getEventoById,
  confirmPosicionamientoEvento,
  iniciarAsistenciaEvento,
  reabrirPosicionamientoEvento,
  createEvento,
  importComanda,
};
