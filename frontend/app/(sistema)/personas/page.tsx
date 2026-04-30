"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { fetchJson } from "@/app/utils/api";

type Persona = {
  id: number;
  legajo: number;
  apellido: string | null;
  nombre: string | null;
  cuil: string | null;
  categoria: string | null;
  tarea: string | null;
  fecha_ingreso: string | null;
  cbu: string | null;
  activo: boolean;
};

type ImportResult = {
  importedCount: number;
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("No se pudo leer el archivo seleccionado."));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error("No se pudo leer el archivo seleccionado."));
    };

    reader.readAsDataURL(file);
  });
}

export default function PersonasPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadPersonas = async () => {
    setLoading(true);

    try {
      const data = await fetchJson<Persona[]>("/api/personas");
      setPersonas(data);
      setError(null);
    } catch (error) {
      console.error("Error al cargar personas:", error);
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el personal."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonas();
  }, []);

  const handleImportClick = () => {
    inputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setImporting(true);

    try {
      const fileContentBase64 = await fileToBase64(file);
      const result = await fetchJson<ImportResult>("/api/personas/importar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileContentBase64,
        }),
      });

      await loadPersonas();
      alert(
        `Maestro importado.\nActivos: ${result.activeCount}\nInactivos: ${result.inactiveCount}\nTotal: ${result.totalCount}`
      );
    } catch (importError) {
      alert(
        importError instanceof Error
          ? importError.message
          : "No se pudo importar el maestro de personal."
      );
    } finally {
      setImporting(false);
    }
  };

  const filteredPersonas = personas.filter((persona) => {
    const text = `${persona.legajo} ${persona.apellido || ""} ${persona.nombre || ""} ${persona.cuil || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Personal</h1>
          <p className="text-slate-500 mt-1">
            Maestro real de personal operativo.
          </p>
        </div>

        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleImportClick}
            disabled={importing}
            className={`rounded-xl px-5 py-3 text-white ${
              importing
                ? "cursor-not-allowed bg-slate-400"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {importing ? "Importando..." : "Importar maestro"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <input
          type="text"
          placeholder="Buscar por legajo, apellido, nombre o CUIL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500">Cargando personas...</div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">Legajo</th>
                <th className="text-left px-4 py-3">Apellido</th>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">CUIL</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-left px-4 py-3">Tarea habitual</th>
                <th className="text-left px-4 py-3">CBU</th>
                <th className="text-left px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredPersonas.map((persona) => (
                <tr key={persona.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">{persona.legajo}</td>
                  <td className="px-4 py-3">{persona.apellido || "-"}</td>
                  <td className="px-4 py-3">{persona.nombre || "-"}</td>
                  <td className="px-4 py-3">{persona.cuil || "-"}</td>
                  <td className="px-4 py-3">{persona.categoria || "-"}</td>
                  <td className="px-4 py-3">{persona.tarea || "-"}</td>
                  <td className="px-4 py-3">{persona.cbu || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        persona.activo
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {persona.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}

              {!loading && filteredPersonas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    No se encontraron personas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
