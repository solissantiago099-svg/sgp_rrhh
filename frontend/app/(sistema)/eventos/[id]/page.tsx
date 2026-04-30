"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchJson } from "@/app/utils/api";

type Evento = {
  id: number;
  nombre_evento: string;
  fecha_evento: string;
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

function getEventoRoute(evento: Evento) {
  if (evento.estado === "convocatoria" || evento.estado === "asistencia") {
    return `/eventos/${evento.id}/convocatoria`;
  }

  return `/eventos/${evento.id}/posicionamiento`;
}

export default function EventoDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvento = async () => {
      try {
        const data = await fetchJson<Evento>(`/api/eventos/${params.id}`);
        setEvento(data);
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el evento."
        );
      } finally {
        setLoading(false);
      }
    };

    loadEvento();
  }, [params.id]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Evento #{params.id}</p>
        <h1 className="text-3xl font-bold text-slate-900">Detalle del evento</h1>
        <p className="text-slate-500 mt-1">
          Resumen del evento importado desde comanda.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {loading ? (
          <p className="text-slate-500">Cargando evento...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : evento ? (
          <>
            <h2 className="text-xl font-semibold text-slate-900">
              {evento.nombre_evento}
            </h2>
            <p className="text-slate-500 mt-1">
              {formatDate(evento.fecha_evento)} · {evento.salon}
            </p>
            <p className="text-slate-500 mt-1">Cliente: {evento.cliente_evento}</p>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => router.push(getEventoRoute(evento))}
                className="rounded-xl bg-slate-900 text-white px-5 py-3 hover:bg-slate-800"
              >
                {evento.estado === "convocatoria" || evento.estado === "asistencia"
                    ? "Ir a convocatoria"
                    : "Ir a posicionamiento"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
