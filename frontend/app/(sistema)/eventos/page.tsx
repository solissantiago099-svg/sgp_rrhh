"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/app/utils/api";

type Evento = {
  id: number;
  fecha_evento: string;
  nombre_evento: string;
  salon: string;
  cliente_evento: string;
  estado: string;
};

function formatDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatEstado(value: string) {
  if (value === "pendiente") return "Posicionamiento";
  if (value === "convocatoria") return "Convocatoria";
  if (value === "asistencia") return "Asistencia";
  return value || "-";
}

function getEstadoClass(value: string) {
  if (value === "pendiente") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (value === "convocatoria") return "bg-sky-50 text-sky-700 ring-sky-200";
  if (value === "asistencia") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getEventoRoute(evento: Evento) {
  if (evento.estado === "convocatoria" || evento.estado === "asistencia") {
    return `/eventos/${evento.id}/convocatoria`;
  }

  return `/eventos/${evento.id}/posicionamiento`;
}

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

export default function EventosPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const pendientes = eventos.filter((evento) => evento.estado === "pendiente").length;
    const convocatorias = eventos.filter(
      (evento) => evento.estado === "convocatoria" || evento.estado === "asistencia"
    ).length;

    return { pendientes, convocatorias };
  }, [eventos]);

  const loadEventos = async () => {
    setLoading(true);

    try {
      const data = await fetchJson<Evento[]>("/api/eventos");
      setEventos(data);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los eventos."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventos();
  }, []);

  const handleImportClick = () => {
    inputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (files.length === 0) return;

    setImporting(true);
    setImportProgress({ current: 0, total: files.length });

    try {
      const failedImports: string[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setImportProgress({ current: index + 1, total: files.length });

        try {
          const fileContentBase64 = await fileToBase64(file);

          await fetchJson("/api/eventos/importar", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileName: file.name,
              fileContentBase64,
            }),
          });
        } catch (fileError) {
          const message =
            fileError instanceof Error
              ? fileError.message
              : "No se pudo importar.";
          failedImports.push(`${file.name}: ${message}`);
        }
      }

      await loadEventos();

      if (failedImports.length > 0) {
        alert(`No se pudieron importar:\n${failedImports.join("\n")}`);
      }
    } catch (importError) {
      alert(
        importError instanceof Error
          ? importError.message
          : "No se pudo importar la comanda."
      );
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Eventos</h1>
          <p className="mt-1 text-slate-500">
            Eventos generados desde comandas importadas.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">A posicionar</p>
            <p className="text-lg font-bold text-amber-700">
              {loading ? "-" : stats.pendientes}
            </p>
          </div>
          <div className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Convocatoria</p>
            <p className="text-lg font-bold text-sky-700">
              {loading ? "-" : stats.convocatorias}
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
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
            {importing && importProgress
              ? `Importando ${importProgress.current}/${importProgress.total}`
              : "Importar comandas"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-sm font-semibold text-slate-950">Listado de eventos</p>
          <p className="mt-1 text-sm text-slate-500">
            Revisá el estado y continuá cada evento desde su acción principal.
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-slate-500">Cargando eventos...</div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : eventos.length === 0 ? (
          <div className="p-6 text-slate-500">
            Todavía no hay eventos importados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Evento</th>
                  <th className="px-5 py-3 text-left">Salón</th>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {eventos.map((evento) => (
                  <tr key={evento.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {formatDate(evento.fecha_evento)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">
                        {evento.nombre_evento}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Evento #{evento.id}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{evento.salon}</td>
                    <td className="px-5 py-4 text-slate-700">
                      {evento.cliente_evento}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getEstadoClass(
                          evento.estado
                        )}`}
                      >
                        {formatEstado(evento.estado)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => router.push(getEventoRoute(evento))}
                        className="rounded-lg bg-[#111111] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#242424]"
                      >
                        {evento.estado === "convocatoria" || evento.estado === "asistencia"
                          ? "Convocatoria"
                          : "Posicionar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
