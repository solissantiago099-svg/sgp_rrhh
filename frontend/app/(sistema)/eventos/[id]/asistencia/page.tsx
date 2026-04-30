"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchJson } from "@/app/utils/api";

type Persona = {
  id: number;
  legajo: number | null;
  apellido: string | null;
  nombre: string | null;
  cuil: string | null;
};

type Evento = {
  id: number;
  nombre_evento: string;
  fecha_evento: string;
  salon: string;
  cliente_evento: string;
};

type AsistenciaEstado = "pendiente" | "presente" | "ausente";

type PosicionamientoApi = {
  id: number;
  evento_id: number;
  dotacion_id: number;
  persona_id: number;
  puesto: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  slot_index: number;
  asistencia_estado?: AsistenciaEstado;
  hora_real_inicio?: string | null;
  hora_real_fin?: string | null;
  horas_descontadas?: number;
  observacion_asistencia?: string | null;
  persona: Persona | null;
};

function formatDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatHorario(horaInicio: string | null, horaFin: string | null) {
  if (!horaInicio && !horaFin) return "Sin horario";
  return `${horaInicio || "--:--"} - ${horaFin || "--:--"}`;
}

function buildPersonaLabel(persona: Persona | null) {
  if (!persona) return "Personal sin datos";
  const nombreCompleto = `${persona.apellido || ""} ${persona.nombre || ""}`.trim();
  return persona.legajo ? `${persona.legajo} - ${nombreCompleto}` : nombreCompleto;
}

function timeToMinutes(value: string | null | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function calculateHours(horaInicio: string | null, horaFin: string | null) {
  const start = timeToMinutes(horaInicio);
  let end = timeToMinutes(horaFin);

  if (start === null || end === null) return 0;
  if (end < start) end += 24 * 60;

  return (end - start) / 60;
}

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function AsistenciaEventoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventoId = Number(params.id);

  const [evento, setEvento] = useState<Evento | null>(null);
  const [posicionamientos, setPosicionamientos] = useState<PosicionamientoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        const [eventoData, posicionamientosData] = await Promise.all([
          fetchJson<Evento>(`/api/eventos/${eventoId}`),
          fetchJson<PosicionamientoApi[]>(`/api/posicionamiento/evento/${eventoId}`),
        ]);

        setEvento(eventoData);
        setPosicionamientos(
          posicionamientosData
            .filter((item) => item.persona !== null)
            .map((item) => ({
              ...item,
              asistencia_estado: item.asistencia_estado || "pendiente",
              hora_real_inicio: item.hora_real_inicio || item.hora_inicio,
              hora_real_fin: item.hora_real_fin || item.hora_fin,
              horas_descontadas: Number(item.horas_descontadas || 0),
            }))
        );
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la asistencia del evento."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventoId]);

  const grupos = useMemo(() => {
    const grouped = new Map<string, PosicionamientoApi[]>();

    posicionamientos.forEach((item) => {
      const key = `${item.puesto}::${item.hora_inicio || ""}::${item.hora_fin || ""}`;
      grouped.set(key, [...(grouped.get(key) || []), item]);
    });

    return Array.from(grouped.entries()).map(([key, items]) => ({
      key,
      puesto: items[0]?.puesto || "-",
      horario: formatHorario(items[0]?.hora_inicio || null, items[0]?.hora_fin || null),
      items,
    }));
  }, [posicionamientos]);

  const totals = useMemo(() => {
    return posicionamientos.reduce(
      (acc, item) => {
        const estado = item.asistencia_estado || "pendiente";
        const horasReales = calculateHours(
          item.hora_real_inicio || null,
          item.hora_real_fin || null
        );
        const horasPago =
          estado === "presente"
            ? Math.max(horasReales - Number(item.horas_descontadas || 0), 0)
            : 0;

        acc[estado] += 1;
        acc.horasPago += horasPago;
        return acc;
      },
      { presente: 0, ausente: 0, pendiente: 0, horasPago: 0 }
    );
  }, [posicionamientos]);

  const updateLocalItem = (
    posicionamientoId: number,
    patch: Partial<PosicionamientoApi>
  ) => {
    setPosicionamientos((prev) =>
      prev.map((item) =>
        item.id === posicionamientoId ? { ...item, ...patch } : item
      )
    );
  };

  const saveAsistencia = async (
    posicionamiento: PosicionamientoApi,
    patch: Partial<PosicionamientoApi>
  ) => {
    const next = { ...posicionamiento, ...patch };
    updateLocalItem(posicionamiento.id, patch);
    setSavingId(posicionamiento.id);

    try {
      const updated = await fetchJson<PosicionamientoApi>(
        `/api/posicionamiento/${posicionamiento.id}/asistencia`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            asistencia_estado: next.asistencia_estado || "pendiente",
            hora_real_inicio: next.hora_real_inicio || null,
            hora_real_fin: next.hora_real_fin || null,
            horas_descontadas: Number(next.horas_descontadas || 0),
            observacion_asistencia: next.observacion_asistencia || null,
          }),
        }
      );

      updateLocalItem(posicionamiento.id, {
        ...updated,
        persona: updated.persona || posicionamiento.persona,
      });
    } catch (saveError) {
      alert(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar la asistencia."
      );
      updateLocalItem(posicionamiento.id, posicionamiento);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="text-slate-500">Cargando asistencia...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Asistencia del evento
          </h1>
          <p className="mt-1 text-slate-500">
            Marcá quién llegó, quién faltó y las horas a descontar para pago.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/eventos/${eventoId}/convocatoria`)}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Volver a convocatoria
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="flex min-h-14 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 lg:col-span-2">
            <p className="text-sm font-semibold text-slate-900">
              {evento?.nombre_evento || "-"}
              <span className="mx-2 text-slate-300">-</span>
              <span className="font-bold">
                {evento ? formatDate(evento.fecha_evento) : "-"}
              </span>
              <span className="mx-2 text-slate-300">-</span>
              <span className="font-normal text-slate-500">{evento?.salon || "-"}</span>
            </p>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5">
            <p className="text-xs text-emerald-700">Presentes</p>
            <p className="mt-0.5 text-lg font-semibold text-emerald-900">
              {totals.presente}
            </p>
          </div>

          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
            <p className="text-xs text-red-700">Ausentes</p>
            <p className="mt-0.5 text-lg font-semibold text-red-900">
              {totals.ausente}
            </p>
          </div>

          <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2.5">
            <p className="text-xs text-sky-700">Horas pago</p>
            <p className="mt-0.5 text-lg font-semibold text-sky-900">
              {formatHours(totals.horasPago)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {grupos.map((grupo) => (
          <section
            key={grupo.key}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {grupo.puesto}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{grupo.horario}</p>
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                  {grupo.items.filter((item) => item.asistencia_estado === "presente").length} presentes
                </span>
                <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-700">
                  {grupo.items.filter((item) => item.asistencia_estado === "ausente").length} ausentes
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                  {grupo.items.filter((item) => (item.asistencia_estado || "pendiente") === "pendiente").length} pendientes
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {grupo.items.map((item) => {
                const estado = item.asistencia_estado || "pendiente";
                const horasReales = calculateHours(
                  item.hora_real_inicio || null,
                  item.hora_real_fin || null
                );
                const horasPago =
                  estado === "presente"
                    ? Math.max(horasReales - Number(item.horas_descontadas || 0), 0)
                    : 0;

                return (
                  <div
                    key={item.id}
                    className="grid gap-3 px-5 py-4 xl:grid-cols-[1.5fr_auto_auto_auto_1fr] xl:items-center"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {buildPersonaLabel(item.persona)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Programado: {formatHorario(item.hora_inicio, item.hora_fin)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          saveAsistencia(item, { asistencia_estado: "presente" })
                        }
                        disabled={savingId === item.id}
                        className={`rounded-lg px-3 py-2 text-sm font-medium ${
                          estado === "presente"
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        Llegó
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          saveAsistencia(item, { asistencia_estado: "ausente" })
                        }
                        disabled={savingId === item.id}
                        className={`rounded-lg px-3 py-2 text-sm font-medium ${
                          estado === "ausente"
                            ? "bg-red-600 text-white"
                            : "bg-red-50 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        No llegó
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={item.hora_real_inicio || ""}
                        onChange={(event) =>
                          updateLocalItem(item.id, {
                            hora_real_inicio: event.target.value,
                          })
                        }
                        onBlur={(event) =>
                          saveAsistencia(item, {
                            hora_real_inicio: event.currentTarget.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                      />
                      <span className="text-slate-400">a</span>
                      <input
                        type="time"
                        value={item.hora_real_fin || ""}
                        onChange={(event) =>
                          updateLocalItem(item.id, {
                            hora_real_fin: event.target.value,
                          })
                        }
                        onBlur={(event) =>
                          saveAsistencia(item, {
                            hora_real_fin: event.currentTarget.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500">Desc.</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.horas_descontadas || 0}
                        onChange={(event) =>
                          updateLocalItem(item.id, {
                            horas_descontadas: Number(event.target.value),
                          })
                        }
                        onBlur={(event) =>
                          saveAsistencia(item, {
                            horas_descontadas: Number(event.currentTarget.value),
                          })
                        }
                        className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                      />
                      <span className="text-sm font-semibold text-slate-900">
                        Pago: {formatHours(horasPago)} hs
                      </span>
                    </div>

                    <input
                      type="text"
                      value={item.observacion_asistencia || ""}
                      onChange={(event) =>
                        updateLocalItem(item.id, {
                          observacion_asistencia: event.target.value,
                        })
                      }
                      onBlur={(event) =>
                        saveAsistencia(item, {
                          observacion_asistencia: event.currentTarget.value,
                        })
                      }
                      placeholder="Observación"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
