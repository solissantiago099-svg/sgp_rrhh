"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/app/utils/api";

type Evento = {
  id: number;
  fecha_evento: string;
  nombre_evento: string;
  salon: string;
  cliente_evento: string;
  estado: string;
};

type Persona = {
  id: number;
  activo: boolean;
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

function getEventoRoute(evento: Evento) {
  if (evento.estado === "convocatoria" || evento.estado === "asistencia") {
    return `/eventos/${evento.id}/convocatoria`;
  }

  return `/eventos/${evento.id}/posicionamiento`;
}

export default function DashboardPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      try {
        const [eventosData, personasData] = await Promise.all([
          fetchJson<Evento[]>("/api/eventos"),
          fetchJson<Persona[]>("/api/personas"),
        ]);

        setEventos(eventosData);
        setPersonas(personasData);
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el inicio."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const activos = personas.filter((persona) => persona.activo).length;
    const inactivos = personas.length - activos;
    const pendientes = eventos.filter((evento) => evento.estado === "pendiente").length;
    const convocatorias = eventos.filter(
      (evento) => evento.estado === "convocatoria" || evento.estado === "asistencia"
    ).length;

    return {
      eventos: eventos.length,
      activos,
      inactivos,
      pendientes,
      convocatorias,
    };
  }, [eventos, personas]);

  const proximosEventos = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...eventos]
      .filter((evento) => {
        if (!evento.fecha_evento) return false;
        const eventDate = new Date(`${evento.fecha_evento}T00:00:00`);
        return eventDate >= today;
      })
      .sort((a, b) => a.fecha_evento.localeCompare(b.fecha_evento))
      .slice(0, 5);
  }, [eventos]);

  const fechaInicio = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="grid min-h-[260px] gap-0 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="flex flex-col justify-center p-6 sm:p-8">
            <div>
              <p className="text-sm font-medium text-sky-700">Inicio</p>
              <h1 className="mt-3 text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">
                {fechaInicio.charAt(0).toUpperCase() + fechaInicio.slice(1)}
              </h1>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/eventos"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Gestionar eventos
              </Link>
              <Link
                href="/personas"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ver personal
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-center border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
            <p className="text-sm font-semibold text-slate-900">Estado general</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-300 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Eventos</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {loading ? "-" : stats.eventos}
                </p>
              </div>
              <div className="rounded-xl border border-slate-300 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Activos</p>
                <p className="mt-2 text-3xl font-bold text-emerald-700">
                  {loading ? "-" : stats.activos}
                </p>
              </div>
              <div className="rounded-xl border border-slate-300 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">A posicionar</p>
                <p className="mt-2 text-3xl font-bold text-amber-700">
                  {loading ? "-" : stats.pendientes}
                </p>
              </div>
              <div className="rounded-xl border border-slate-300 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Convocatoria</p>
                <p className="mt-2 text-3xl font-bold text-sky-700">
                  {loading ? "-" : stats.convocatorias}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Próximos eventos
              </h2>
            </div>
            <Link
              href="/eventos"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Ver todos
            </Link>
          </div>

          <div className="divide-y divide-slate-200">
            {loading ? (
              <div className="p-5 text-slate-500">Cargando agenda...</div>
            ) : proximosEventos.length === 0 ? (
              <div className="p-5 text-slate-500">
                No hay eventos próximos cargados.
              </div>
            ) : (
              proximosEventos.map((evento) => (
                <Link
                  key={evento.id}
                  href={getEventoRoute(evento)}
                  className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[120px_1fr_auto] md:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {formatDate(evento.fecha_evento)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Evento #{evento.id}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">
                      {evento.nombre_evento}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {evento.salon} · {evento.cliente_evento}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {formatEstado(evento.estado)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Accesos rápidos
            </h2>
            <div className="mt-4 grid gap-3">
              <Link
                href="/eventos"
                className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <p className="font-semibold text-slate-950">Importar comandas</p>
                <p className="mt-1 text-sm text-slate-500">
                  Crear eventos desde archivos Excel.
                </p>
              </Link>
              <Link
                href="/personas"
                className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <p className="font-semibold text-slate-950">Actualizar maestro</p>
                <p className="mt-1 text-sm text-slate-500">
                  Importar personal y revisar activos e inactivos.
                </p>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Maestro de personal
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold text-emerald-700">Activos</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">
                  {loading ? "-" : stats.activos}
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-xs font-semibold text-slate-600">Inactivos</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {loading ? "-" : stats.inactivos}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Los inactivos se conservan en el maestro, pero no aparecen para
              posicionar personal.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
