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
  categoria: string | null;
  tarea: string | null;
  fecha_ingreso: string | null;
  cbu: string | null;
  activo: boolean;
  tipo_personal?: "eventual" | "fijo";
};

type Evento = {
  id: number;
  nombre_evento: string;
  fecha_evento: string;
  salon: string;
  cliente_evento: string;
  estado: string;
};

type DotacionApi = {
  id: number;
  evento_id: number;
  puesto: string;
  cantidad_base: number;
  cantidad_requerida: number;
  hora_ingreso: string | null;
  hora_egreso: string | null;
  jornada_horas: number | null;
};

type PosicionamientoApi = {
  id: number;
  evento_id: number;
  dotacion_id: number;
  persona_id: number;
  puesto: string;
  hora_inicio: string;
  hora_fin: string;
  slot_index: number;
  persona: Persona | null;
};

type DotacionItem = {
  id: number;
  puesto: string;
  cantidadBase: number;
  cantidad: number;
  horaIngreso: string | null;
  horaEgreso: string | null;
  horario: string;
  asignados: (Persona | null)[];
};

type PersonalTab = "eventuales" | "fijos";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getTareaFilterValue(tarea: string | null) {
  const normalized = normalizeText(tarea || "");

  return normalized
    .replace(/\bcamarera\b/g, "camarero")
    .replace(/\bcocinera\b/g, "cocinero")
    .replace(/\bbachera\b/g, "bachero")
    .replace(/\bmoza\b/g, "mozo");
}

function getTareaFilterLabel(tarea: string) {
  return tarea
    .replace(/\b[Cc]amarera\b/g, "Camarero")
    .replace(/\b[Cc]ocinera\b/g, "Cocinero")
    .replace(/\b[Bb]achera\b/g, "Bachero")
    .replace(/\b[Mm]oza\b/g, "Mozo");
}

function formatDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatUnavailableEvent(evento: Evento) {
  if (!evento.fecha_evento) return evento.salon || "Sin salÃ³n";

  const [, month, day] = evento.fecha_evento.split("-");
  const shortDate = day && month ? `${Number(day)}-${Number(month)}` : "-";

  return `${evento.salon || "Sin salÃ³n"} - ${shortDate}`;
}

function formatHorario(horaIngreso: string | null, horaEgreso: string | null) {
  if (!horaIngreso && !horaEgreso) return "Sin horario";
  return `${horaIngreso || "--:--"} - ${horaEgreso || "--:--"}`;
}

function formatPersonaLabel(persona: Persona) {
  const nombreCompleto = `${persona.apellido || ""} ${persona.nombre || ""}`.trim();

  if (persona.legajo) {
    return `${persona.legajo} - ${nombreCompleto}`.trim();
  }

  return nombreCompleto || persona.cuil || "Sin nombre";
}

function buildDotacionState(
  dotaciones: DotacionApi[],
  posicionamientos: PosicionamientoApi[]
) {
  return dotaciones.map((item) => {
    const asignados = Array.from(
      { length: item.cantidad_requerida },
      () => null as Persona | null
    );

    posicionamientos
      .filter((posicionamiento) => posicionamiento.dotacion_id === item.id)
      .forEach((posicionamiento) => {
        if (
          posicionamiento.slot_index >= 0 &&
          posicionamiento.slot_index < asignados.length
        ) {
          asignados[posicionamiento.slot_index] = posicionamiento.persona;
        }
      });

    return {
      id: item.id,
      puesto: item.puesto,
      cantidadBase: item.cantidad_base,
      cantidad: item.cantidad_requerida,
      horaIngreso: item.hora_ingreso,
      horaEgreso: item.hora_egreso,
      horario: formatHorario(item.hora_ingreso, item.hora_egreso),
      asignados,
    };
  });
}

export default function PosicionamientoEventoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventoId = Number(params.id);

  const [evento, setEvento] = useState<Evento | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personalFijo, setPersonalFijo] = useState<Persona[]>([]);
  const [todosPosicionamientos, setTodosPosicionamientos] = useState<
    PosicionamientoApi[]
  >([]);
  const [dotacion, setDotacion] = useState<DotacionItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalDotacionId, setModalDotacionId] = useState<number | null>(null);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [personalTab, setPersonalTab] = useState<PersonalTab>("eventuales");
  const [tareaFilter, setTareaFilter] = useState("todas");

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);

      try {
        const [
          eventoData,
          eventosData,
          personasData,
          personalFijoData,
          dotacionesData,
          posicionamientosData,
          todosPosicionamientosData,
        ] =
          await Promise.all([
            fetchJson<Evento>(`/api/eventos/${eventoId}`),
            fetchJson<Evento[]>("/api/eventos"),
            fetchJson<Persona[]>("/api/personas"),
            fetchJson<Persona[]>("/api/personas/fijos"),
            fetchJson<DotacionApi[]>(`/api/dotacion/evento/${eventoId}`),
            fetchJson<PosicionamientoApi[]>(
              `/api/posicionamiento/evento/${eventoId}`
            ),
            fetchJson<PosicionamientoApi[]>("/api/posicionamiento"),
          ]);

        setEvento(eventoData);
        setEventos(eventosData);
        setPersonas(personasData.filter((persona) => persona.activo));
        setPersonalFijo(personalFijoData);
        setTodosPosicionamientos(todosPosicionamientosData);
        setDotacion(buildDotacionState(dotacionesData, posicionamientosData));
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar los datos del posicionamiento."
        );
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [eventoId]);

  useEffect(() => {
    if (evento?.estado === "convocatoria" || evento?.estado === "asistencia") {
      router.replace(`/eventos/${eventoId}/convocatoria`);
    }
  }, [evento, eventoId, router]);

  const totalRequeridos = useMemo(() => {
    return dotacion.reduce((acc, item) => acc + item.cantidad, 0);
  }, [dotacion]);

  const totalCubiertos = useMemo(() => {
    return dotacion.reduce(
      (acc, item) => acc + item.asignados.filter(Boolean).length,
      0
    );
  }, [dotacion]);

  const posicionamientoCompleto =
    dotacion.length > 0 && totalRequeridos > 0 && totalCubiertos === totalRequeridos;

  const modalDotacion = useMemo(() => {
    if (modalDotacionId === null) return null;
    return dotacion.find((item) => item.id === modalDotacionId) || null;
  }, [dotacion, modalDotacionId]);

  const assignedIds = useMemo(() => {
    const ids = new Set<number>();

    dotacion.forEach((item) => {
      item.asignados.forEach((persona) => {
        if (persona?.id) ids.add(persona.id);
      });
    });

    return ids;
  }, [dotacion]);

  const unavailableByPersonaId = useMemo(() => {
    const unavailable = new Map<number, Evento>();
    if (!evento) return unavailable;

    const eventosById = new Map(
      eventos.map((currentEvento) => [currentEvento.id, currentEvento])
    );

    todosPosicionamientos.forEach((posicionamiento) => {
      if (Number(posicionamiento.evento_id) === eventoId) return;

      const eventoAsignado = eventosById.get(Number(posicionamiento.evento_id));

      if (eventoAsignado?.fecha_evento === evento.fecha_evento) {
        unavailable.set(Number(posicionamiento.persona_id), eventoAsignado);
      }
    });

    return unavailable;
  }, [evento, eventoId, eventos, todosPosicionamientos]);

  const filteredPersonas = useMemo(() => {
    let result =
      personalTab === "eventuales"
        ? personas.filter((persona) => persona.activo)
        : personalFijo.filter((persona) => persona.activo !== false);

    if (personalTab === "eventuales" && tareaFilter !== "todas") {
      result = result.filter(
        (persona) => getTareaFilterValue(persona.tarea) === tareaFilter
      );
    }

    if (search.trim()) {
      const query = normalizeText(search);

      result = result.filter((persona) => {
        const text = normalizeText(
          `${persona.legajo || ""} ${persona.apellido || ""} ${persona.nombre || ""} ${persona.cuil || ""} ${persona.tarea || ""}`
        );

        return text.includes(query);
      });
    }

    return result
      .sort((a, b) => {
        const aUnavailable =
          assignedIds.has(a.id) || unavailableByPersonaId.has(a.id);
        const bUnavailable =
          assignedIds.has(b.id) || unavailableByPersonaId.has(b.id);

        if (aUnavailable === bUnavailable) return 0;
        return aUnavailable ? 1 : -1;
      })
      .slice(0, 60);
  }, [
    personas,
    personalFijo,
    personalTab,
    search,
    tareaFilter,
    assignedIds,
    unavailableByPersonaId,
  ]);

  const tareaOptions = useMemo(() => {
    const tareas = new Map<string, string>();

    personas.forEach((persona) => {
      const tarea = persona.tarea?.trim();
      if (!tarea) return;

      const value = getTareaFilterValue(tarea);
      if (!tareas.has(value)) {
        tareas.set(value, getTareaFilterLabel(tarea));
      }
    });

    return Array.from(tareas.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [personas]);

  const closeSelectorModal = () => {
    if (saving) return;
    setModalDotacionId(null);
    setSelectedPersonaIds([]);
    setSearch("");
  };

  const toggleSelectedPersona = (personaId: number) => {
    if (!modalDotacion) return;

    const cuposDisponibles = getFaltantes(modalDotacion);

    setSelectedPersonaIds((prev) => {
      if (prev.includes(personaId)) {
        return prev.filter((id) => id !== personaId);
      }

      if (prev.length >= cuposDisponibles) {
        return prev;
      }

      return [...prev, personaId];
    });
  };

  const handleAssignSelectedPersonas = async () => {
    if (!modalDotacion || selectedPersonaIds.length === 0) return;

    const emptySlots = modalDotacion.asignados
      .map((persona, slotIndex) => (persona ? null : slotIndex))
      .filter((slotIndex): slotIndex is number => slotIndex !== null);

    if (selectedPersonaIds.length > emptySlots.length) {
      alert("La seleccion supera los cupos disponibles del puesto.");
      return;
    }

    const basePersonas = personalTab === "eventuales" ? personas : personalFijo;
    const selectedPersonas = selectedPersonaIds
      .map((personaId) =>
        basePersonas.find((persona) => persona.id === personaId)
      )
      .filter((persona): persona is Persona => Boolean(persona));

    setSaving(true);

    try {
      const createdItems: PosicionamientoApi[] = [];

      for (let index = 0; index < selectedPersonas.length; index += 1) {
        const persona = selectedPersonas[index];
        const created = await fetchJson<PosicionamientoApi>("/api/posicionamiento", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            evento_id: eventoId,
            dotacion_id: modalDotacion.id,
            persona_id: persona.id,
            slot_index: emptySlots[index],
            puesto: modalDotacion.puesto,
            hora_inicio: modalDotacion.horaIngreso,
            hora_fin: modalDotacion.horaEgreso,
          }),
        });

        createdItems.push({
          ...created,
          persona: created.persona || persona,
        });
      }

      setDotacion((prev) =>
        prev.map((item) => {
          if (item.id !== modalDotacion.id) return item;

          const nuevosAsignados = [...item.asignados];
          createdItems.forEach((created) => {
            nuevosAsignados[created.slot_index] = created.persona;
          });

          return {
            ...item,
            asignados: nuevosAsignados,
          };
        })
      );
      setTodosPosicionamientos((prev) => [...prev, ...createdItems]);
      setModalDotacionId(null);
      setSelectedPersonaIds([]);
      setSearch("");
    } catch (assignError) {
      alert(
        assignError instanceof Error
          ? assignError.message
          : "No se pudo guardar la asignacion."
      );
    } finally {
      setSaving(false);
    }
  };
  const handleRemovePersona = async (dotacionId: number, slotIndex: number) => {
    setSaving(true);

    try {
      await fetchJson(
        `/api/posicionamiento/evento/${eventoId}/dotacion/${dotacionId}/slot/${slotIndex}`,
        {
          method: "DELETE",
        }
      );

      setDotacion((prev) =>
        prev.map((item) => {
          if (item.id !== dotacionId) return item;

          const nuevosAsignados = [...item.asignados];
          nuevosAsignados[slotIndex] = null;

          return {
            ...item,
            asignados: nuevosAsignados,
          };
        })
      );
      setTodosPosicionamientos((prev) =>
        prev.filter(
          (item) =>
            !(
              Number(item.evento_id) === eventoId &&
              Number(item.dotacion_id) === dotacionId &&
              Number(item.slot_index) === slotIndex
            )
        )
      );
    } catch (removeError) {
      alert(
        removeError instanceof Error
          ? removeError.message
          : "No se pudo quitar a la persona."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveExtraPersonal = async (dotacionId: number) => {
    const item = dotacion.find((currentItem) => currentItem.id === dotacionId);
    if (!item) return;

    const lastSlotIndex = item.asignados.length - 1;
    const lastSlot = item.asignados[lastSlotIndex];

    if (item.cantidad <= item.cantidadBase) {
      alert("Ese puesto no tiene cupos extra para quitar.");
      return;
    }

    if (lastSlot) {
      alert("Primero desasigná a la persona del último cupo extra.");
      return;
    }

    setSaving(true);

    try {
      await fetchJson(`/api/dotacion/${dotacionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cantidad_requerida: item.cantidad - 1,
        }),
      });

      setDotacion((prev) =>
        prev.map((currentItem) => {
          if (currentItem.id !== dotacionId) return currentItem;

          return {
            ...currentItem,
            cantidad: currentItem.cantidad - 1,
            asignados: currentItem.asignados.slice(0, -1),
          };
        })
      );

      if (modalDotacionId === dotacionId) {
        setSelectedPersonaIds([]);
      }
    } catch (removeError) {
      alert(
        removeError instanceof Error
          ? removeError.message
          : "No se pudo quitar el cupo extra."
      );
    } finally {
      setSaving(false);
    }
  };

  const getCubiertos = (item: DotacionItem) =>
    item.asignados.filter(Boolean).length;

  const getFaltantes = (item: DotacionItem) =>
    item.cantidad - getCubiertos(item);

  const handleConfirmPosicionamiento = async () => {
    if (!posicionamientoCompleto) {
      alert("Completá todos los slots antes de confirmar el posicionamiento.");
      return;
    }

    setSaving(true);

    try {
      const updated = await fetchJson<Evento>(
        `/api/eventos/${eventoId}/confirmar-posicionamiento`,
        {
          method: "PATCH",
        }
      );

      setEvento(updated);
      router.push(`/eventos/${eventoId}/convocatoria`);
    } catch (confirmError) {
      alert(
        confirmError instanceof Error
          ? confirmError.message
          : "No se pudo confirmar el posicionamiento."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return <div className="text-slate-500">Cargando posicionamiento...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-slate-500">Evento #{evento?.id}</p>
          <h1 className="text-3xl font-bold text-slate-900">
            Posicionamiento del evento
          </h1>
          <p className="text-slate-500 mt-1">
            Asignación de personal por puesto y horario.
          </p>
        </div>

        <button
          type="button"
          onClick={handleConfirmPosicionamiento}
          disabled={saving || !posicionamientoCompleto}
          title={
            posicionamientoCompleto
              ? "Confirmar posicionamiento"
              : "Completá todos los slots para confirmar"
          }
          className={`rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition ${
            saving || !posicionamientoCompleto
              ? "cursor-not-allowed bg-slate-400"
              : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {saving ? "Confirmando..." : "Confirmar posicionamiento"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Evento</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {evento?.nombre_evento || "-"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {evento ? formatDate(evento.fecha_evento) : "-"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Total requerido</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {totalRequeridos}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Total cubierto</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {totalCubiertos}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {dotacion.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-500">
            Este evento todavia no tiene dotaciones importadas.
          </div>
        ) : null}

        {dotacion.map((item) => {
          const cubiertos = getCubiertos(item);
          const faltantes = getFaltantes(item);
          const completed = faltantes === 0;

          return (
            <section
              key={item.id}
              role={completed || saving ? undefined : "button"}
              tabIndex={completed || saving ? undefined : 0}
              onClick={() => {
                if (completed || saving) return;
                setModalDotacionId(item.id);
                setSelectedPersonaIds([]);
                setSearch("");
              }}
              onKeyDown={(event) => {
                if (completed || saving) return;
                if (event.target !== event.currentTarget) return;
                if (event.key !== "Enter" && event.key !== " ") return;

                event.preventDefault();
                setModalDotacionId(item.id);
                setSelectedPersonaIds([]);
                setSearch("");
              }}
              className={`overflow-hidden rounded-2xl border bg-white transition ${
                completed || saving
                  ? "border-slate-200"
                  : "cursor-pointer border-slate-200 hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              }`}
            >
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {item.puesto}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{item.horario}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                      completed
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {cubiertos}/{item.cantidad} cubiertos
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                {item.asignados.map((persona, index) => {
                  const isExtra = index >= item.cantidadBase;

                  return (
                    <div
                      key={`${item.id}-${index}`}
                      className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        {persona ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">
                                {formatPersonaLabel(persona)}
                              </p>
                              {isExtra ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                  Extra
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              {persona.categoria || "Sin categoria"} - {persona.tarea || "Sin tarea"}
                            </p>
                          </>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-400">
                              Slot {index + 1} vacio
                            </p>
                            {isExtra ? (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                Extra
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {persona ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemovePersona(item.id, index);
                            }}
                            disabled={saving}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              saving
                                ? "cursor-not-allowed border-slate-200 text-slate-400"
                                : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            Quitar
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {item.cantidad > item.cantidadBase ? (
                <div className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-4">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemoveExtraPersonal(item.id);
                    }}
                    disabled={saving}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      saving
                        ? "cursor-not-allowed border-slate-200 text-slate-400"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Quitar extra
                  </button>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>

    {modalDotacion ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
        onClick={closeSelectorModal}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Completar {modalDotacion.puesto}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedPersonaIds.length}/{getFaltantes(modalDotacion)} seleccionados - {modalDotacion.horario}
              </p>
            </div>

            <button
              type="button"
              onClick={closeSelectorModal}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              Cerrar
            </button>
          </div>

          <div className="grid min-h-0 gap-5 overflow-y-auto px-6 py-5 lg:grid-cols-[260px_1fr]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setPersonalTab("eventuales");
                    setSelectedPersonaIds([]);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    personalTab === "eventuales"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Eventuales
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPersonalTab("fijos");
                    setSelectedPersonaIds([]);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    personalTab === "fijos"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Fijos
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Buscar persona
                </label>
                <input
                  type="text"
                  placeholder="Legajo, apellido, nombre o CUIL..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                />
              </div>

              {personalTab === "eventuales" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Tarea
                  </label>
                  <select
                    value={tareaFilter}
                    onChange={(event) => setTareaFilter(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
                  >
                    <option value="todas">Todas</option>
                    {tareaOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500">
                Resultados disponibles
              </div>

              <div className="max-h-[54vh] divide-y divide-slate-200 overflow-y-auto">
                {filteredPersonas.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-500">
                    No se encontraron personas para esa busqueda.
                  </div>
                ) : (
                  filteredPersonas.map((persona) => {
                    const alreadyAssigned = assignedIds.has(persona.id);
                    const unavailableEvent = unavailableByPersonaId.get(persona.id);
                    const selected = selectedPersonaIds.includes(persona.id);
                    const reachedLimit =
                      selectedPersonaIds.length >= getFaltantes(modalDotacion);
                    const disabled =
                      alreadyAssigned ||
                      Boolean(unavailableEvent) ||
                      saving ||
                      (!selected && reachedLimit);

                    return (
                      <label
                        key={persona.id}
                        className={`flex cursor-pointer flex-col gap-3 px-5 py-4 transition md:flex-row md:items-center md:justify-between ${
                          disabled && !selected ? "bg-slate-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-900">
                            {formatPersonaLabel(persona)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {persona.categoria || "Sin categoria"} - {persona.tarea || "Sin tarea"}
                          </p>
                          {unavailableEvent ? (
                            <p className="mt-1 text-[11px] text-red-600">
                              {formatUnavailableEvent(unavailableEvent)}
                            </p>
                          ) : alreadyAssigned ? (
                            <p className="mt-1 text-[11px] text-slate-500">
                              Ya asignado en este evento
                            </p>
                          ) : null}
                        </div>

                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={disabled && !selected}
                          onChange={() => toggleSelectedPersona(persona.id)}
                          className="h-5 w-5 rounded border-slate-300 accent-slate-900"
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={closeSelectorModal}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAssignSelectedPersonas}
              disabled={saving || selectedPersonaIds.length === 0}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                saving || selectedPersonaIds.length === 0
                  ? "cursor-not-allowed bg-slate-400"
                  : "bg-[#111111] hover:bg-[#242424]"
              }`}
            >
              {saving ? "Guardando..." : "Confirmar seleccion"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
