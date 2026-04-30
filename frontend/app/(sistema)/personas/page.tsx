"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
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

function formatPersonaName(persona: Persona) {
  return `${persona.apellido || ""} ${persona.nombre || ""}`.trim() || "-";
}

export default function PersonasPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const activos = personas.filter((persona) => persona.activo).length;
    return {
      activos,
      inactivos: personas.length - activos,
      total: personas.length,
    };
  }, [personas]);

  const loadPersonas = async () => {
    setLoading(true);

    try {
      const data = await fetchJson<Persona[]>("/api/personas");
      setPersonas(data);
      setError(null);
    } catch (loadError) {
      console.error("Error al cargar personas:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
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
    const text = `${persona.legajo} ${persona.apellido || ""} ${
      persona.nombre || ""
    } ${persona.cuil || ""} ${persona.tarea || ""}`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Personal</h1>
          <p className="mt-1 text-slate-500">
            Maestro real de personal operativo.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Activos</p>
            <p className="text-lg font-bold text-emerald-700">
              {loading ? "-" : stats.activos}
            </p>
          </div>
          <div className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Inactivos</p>
            <p className="text-lg font-bold text-slate-700">
              {loading ? "-" : stats.inactivos}
            </p>
          </div>

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
            className={`rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition ${
              importing
                ? "cursor-not-allowed bg-slate-400"
                : "bg-[#111111] hover:bg-[#242424]"
            }`}
          >
            {importing ? "Importando..." : "Importar maestro"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Buscar por legajo, apellido, nombre, CUIL o tarea..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#111111] focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Listado de eventuales
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Cargando..." : `${filteredPersonas.length} personas visibles`}
            </p>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Total maestro: {loading ? "-" : stats.total}
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-slate-500">Cargando personas...</div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3 text-left">Legajo</th>
                  <th className="px-5 py-3 text-left">Persona</th>
                  <th className="px-5 py-3 text-left">CUIL</th>
                  <th className="px-5 py-3 text-left">Categoría</th>
                  <th className="px-5 py-3 text-left">Tarea habitual</th>
                  <th className="px-5 py-3 text-left">CBU</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPersonas.map((persona) => (
                  <tr key={persona.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-950">
                      {persona.legajo}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">
                        {formatPersonaName(persona)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {persona.cuil || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {persona.categoria || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {persona.tarea || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {persona.cbu || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                          persona.activo
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-slate-100 text-slate-600 ring-slate-200"
                        }`}
                      >
                        {persona.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredPersonas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                      No se encontraron personas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
