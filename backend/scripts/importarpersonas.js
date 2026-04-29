const XLSX = require("xlsx");
const path = require("path");

// 👉 RUTAS A TUS ARCHIVOS
const archivoBase = path.join(__dirname, "../data/maestro.xlsx");
const archivoCBU = path.join(__dirname, "../data/cbu.xlsx");

// ------------------------
// Leer Excel
// ------------------------
const leerExcel = (ruta) => {
  const workbook = XLSX.readFile(ruta);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet);
};

// ------------------------
// Normalizar texto
// ------------------------
const clean = (value) => {
  if (!value) return null;
  return String(value).trim();
};

// ------------------------
// MAIN
// ------------------------
const importar = () => {
  console.log("📥 Leyendo archivos...");

const base = leerExcel(archivoBase);
const cbu = leerExcel(archivoCBU);

  console.log("COLUMNAS BASE:");
  console.log(Object.keys(base[0]));

  console.log("PRIMERA FILA BASE:");
  console.log(base[0]);

  console.log("COLUMNAS CBU:");
  console.log(Object.keys(cbu[0]));

  console.log("PRIMERA FILA CBU:");
  console.log(cbu[0]);

  console.log("Base:", base.length);
  console.log("CBU:", cbu.length);

  // ------------------------
  // Mapear CBU por legajo
  // ------------------------
  const cbuMap = {};

  cbu.forEach((row) => {
    const legajo = clean(row["Número de legajo"] || row["Legajo"]);

    if (!legajo) return;

    cbuMap[legajo] = {
      cbu: clean(row["CBU"]),
    };
  });

  // ------------------------
  // Unificar personas
  // ------------------------
  const personas = base.map((row) => {
    const legajo = clean(row["Número de legajo"]);

    const datosCBU = cbuMap[legajo] || {};

    return {
      id: Number(legajo),
      legajo: Number(legajo),
      apellido: clean(row["Apellido"]),
      nombre: clean(row["Nombre"]),
      cuil: clean(row["C.U.I.L."]),
      categoria: clean(row["Descripción de categoría"]),
      tarea: clean(row["Tarea habitual"]),
      fecha_ingreso: clean(row["Fecha de ingreso"]),
      cbu: datosCBU.cbu || null,
      activo: true,
    };
  });

  // ------------------------
  // Agregar los que están en CBU pero no en base
  // ------------------------
  cbu.forEach((row) => {
    const legajo = clean(row["Número de legajo"] || row["Legajo"]);

    const yaExiste = personas.find((p) => p.legajo === Number(legajo));

    if (!yaExiste && legajo) {
      personas.push({
        id: Number(legajo),
        legajo: Number(legajo),
        apellido: clean(row["Apellido"]),
        nombre: clean(row["Nombre"]),
        cuil: null,
        categoria: null,
        tarea: null,
        fecha_ingreso: null,
        cbu: clean(row["CBU"]),
        activo: true,
      });
    }
  });

  console.log("✅ Personas unificadas:", personas.length);

  // ------------------------
  // Guardar JSON
  // ------------------------
  const fs = require("fs");

  const outputPath = path.join(__dirname, "../data/personas.json");

  fs.writeFileSync(outputPath, JSON.stringify(personas, null, 2));

  console.log("📁 Archivo generado: personas.json");
};

importar();