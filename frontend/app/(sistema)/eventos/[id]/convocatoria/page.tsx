"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  nombre_operativo?: string | null;
  tipo_personal?: "eventual" | "fijo";
  activo: boolean;
};

type Evento = {
  id: number;
  nombre_evento: string;
  fecha_evento: string;
  salon: string;
  cliente_evento: string;
  estado: string;
};

type PosicionamientoApi = {
  id: number;
  evento_id: number;
  dotacion_id: number;
  persona_id: number;
  puesto: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  slot_index: number;
  confirmado: boolean;
  reemplazo_desde_persona_id: number | null;
  persona: Persona | null;
};

type DotacionApi = {
  id: number;
  evento_id: number;
  puesto: string;
  cantidad_requerida: number;
  hora_ingreso: string | null;
  hora_egreso: string | null;
  jornada_horas: number | null;
};

type GrupoConvocatoria = {
  key: string;
  puesto: string;
  horario: string;
  items: PosicionamientoApi[];
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function formatHorario(horaInicio: string | null, horaFin: string | null) {
  if (!horaInicio && !horaFin) return "Sin horario";
  return `${horaInicio || "--:--"} - ${horaFin || "--:--"}`;
}

function buildPersonaLabel(persona: Persona | null) {
  if (!persona) return "Personal sin datos";
  const nombreCompleto = `${persona.apellido || ""} ${persona.nombre || ""}`.trim();

  if (persona.legajo) {
    return `${persona.legajo} - ${nombreCompleto}`.trim();
  }

  return nombreCompleto || persona.cuil || "Sin nombre";
}

function buildPersonaMeta(persona: Persona | null) {
  if (!persona) return "Sin datos disponibles";
  return `${persona.categoria || "Sin categoría"} · ${persona.tarea || "Sin tarea"}`;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPersonaName(persona: Persona | null) {
  if (!persona) return "";
  return `${persona.apellido || ""} ${persona.nombre || ""}`.trim();
}

function buildPersonaPaymentName(persona: Persona | null) {
  if (!persona) return "";
  return persona.nombre_operativo?.trim() || buildPersonaName(persona);
}

function isPersonaFija(persona: Persona | null) {
  if (!persona) return false;
  return (
    persona.tipo_personal === "fijo" ||
    normalizeText(persona.categoria || "") === "personal fijo"
  );
}

function getPlanillaCliente(evento: Evento | null) {
  const text = normalizeText(
    `${evento?.cliente_evento || ""} ${evento?.nombre_evento || ""} ${evento?.salon || ""}`
  );

  if (text.includes("rut")) return "DONDERA";
  if (text.includes("origami")) return "KUMITATE";
  if (text.includes("central")) return "LUAR";
  if (text.includes("la rural")) return "1876";

  return "";
}

function calculateHours(horaInicio: string | null, horaFin: string | null) {
  if (!horaInicio || !horaFin) return "";

  const parseTime = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const start = parseTime(horaInicio);
  let end = parseTime(horaFin);

  if (start === null || end === null) return "";
  if (end < start) end += 24 * 60;

  const hours = (end - start) / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2);
}

const PUESTO_VALORES: Record<string, number> = {
  bachero: 4195.8,
  cocinero: 5472.94,
  ayudante_limpieza: 7700,
  cabecera: 8209.41,
  camarero: 5472.94,
  camarero_de_armado: 5472.94,
  capitan_de_bacha: 8209.41,
  capitan_de_cocina: 8209.41,
  capitan_de_armado: 8209.41,
  capitan_de_salon: 8209.41,
  jefe_de_producto: 10945.88,
  maitre: 10945.88,
  runner: 6000,
  bartender: 7000,
  encargado_de_barra: 12000,
  jefe_de_barra: 10000,
  armador_de_barra: 8250,
  bachero_de_barra: 5000,
  bartender_pista: 5416,
  encargado_de_barra_pista: 20833,
  jefe_de_barra_pista: 8333,
  guardarropas: 5472.94,
};

const PUESTO_VALOR_ALIASES: Record<string, string> = {
  camarero_armado: "camarero_de_armado",
  camareros_armado: "camarero_de_armado",
  jefe_de_cocina: "jefe_de_producto",
};

function normalizePuestoKey(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getPuestoValor(puesto: string) {
  const baseKey = normalizePuestoKey(puesto);
  const keys = [
    baseKey,
    baseKey.replace(/_(?:1er|1|primer|2do|2|segundo|3er|3|tercer)_turno$/, ""),
    baseKey.replace(/_cierre$/, ""),
  ];

  for (const key of keys) {
    const normalizedKey = PUESTO_VALOR_ALIASES[key] || key;
    const value = PUESTO_VALORES[normalizedKey];

    if (value) return value;
  }

  return 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatIntegerMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function getPaymentHours(dotacion: DotacionApi) {
  if (dotacion.jornada_horas !== null && dotacion.jornada_horas !== undefined) {
    return Number(dotacion.jornada_horas);
  }

  const calculated = calculateHours(dotacion.hora_ingreso, dotacion.hora_egreso);
  if (!calculated) return null;

  const parsed = Number(calculated.replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
}

function buildDownloadFileName(evento: Evento | null) {
  const baseName = evento?.nombre_evento || "posicionamiento";

  return `${baseName}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function groupPosicionamientos(
  posicionamientos: PosicionamientoApi[]
): GrupoConvocatoria[] {
  const groups = new Map<string, GrupoConvocatoria>();

  posicionamientos.forEach((item) => {
    const key = `${item.puesto}::${item.hora_inicio || ""}::${item.hora_fin || ""}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        puesto: item.puesto,
        horario: formatHorario(item.hora_inicio, item.hora_fin),
        items: [],
      });
    }

    groups.get(key)?.items.push(item);
  });

  return Array.from(groups.values());
}

export default function ConvocatoriaEventoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventoId = Number(params.id);

  const [evento, setEvento] = useState<Evento | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [dotaciones, setDotaciones] = useState<DotacionApi[]>([]);
  const [posicionamientos, setPosicionamientos] = useState<PosicionamientoApi[]>([]);
  const [todosPosicionamientos, setTodosPosicionamientos] = useState<
    PosicionamientoApi[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [modalTarget, setModalTarget] = useState<PosicionamientoApi | null>(null);
  const [addTarget, setAddTarget] = useState<GrupoConvocatoria | null>(null);
  const [search, setSearch] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        const [
          eventoData,
          eventosData,
          posicionamientosData,
          todosPosicionamientosData,
          personasData,
          dotacionesData,
        ] = await Promise.all([
          fetchJson<Evento>(`/api/eventos/${eventoId}`),
          fetchJson<Evento[]>("/api/eventos"),
          fetchJson<PosicionamientoApi[]>(`/api/posicionamiento/evento/${eventoId}`),
          fetchJson<PosicionamientoApi[]>("/api/posicionamiento"),
          fetchJson<Persona[]>("/api/personas"),
          fetchJson<DotacionApi[]>(`/api/dotacion/evento/${eventoId}`),
        ]);

        setEvento(eventoData);
        setEventos(eventosData);
        setDotaciones(dotacionesData);
        setPosicionamientos(
          posicionamientosData.filter((item) => item.persona !== null)
        );
        setTodosPosicionamientos(todosPosicionamientosData);
        setPersonas(personasData.filter((persona) => persona.activo));
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la convocatoria del evento."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventoId]);

  useEffect(() => {
    if (!actionsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionsOpen]);

  const grupos = useMemo(
    () => groupPosicionamientos(posicionamientos),
    [posicionamientos]
  );

  const totalConvocados = posicionamientos.length;
  const totalConfirmados = posicionamientos.filter((item) => item.confirmado).length;
  const totalPendientes = totalConvocados - totalConfirmados;

  const assignedPersonaIds = useMemo(() => {
    const ids = new Set<number>();

    posicionamientos.forEach((item) => {
      ids.add(item.persona_id);
    });

    return ids;
  }, [posicionamientos]);

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
    let result = [...personas];

    if (search.trim()) {
      const query = normalizeText(search);

      result = result.filter((persona) => {
        const text = normalizeText(
          `${persona.legajo || ""} ${persona.apellido || ""} ${persona.nombre || ""} ${persona.cuil || ""}`
        );

        return text.includes(query);
      });
    }

    return result
      .sort((a, b) => {
        const aUnavailable =
          assignedPersonaIds.has(a.id) || unavailableByPersonaId.has(a.id);
        const bUnavailable =
          assignedPersonaIds.has(b.id) || unavailableByPersonaId.has(b.id);

        if (aUnavailable === bUnavailable) return 0;
        return aUnavailable ? 1 : -1;
      })
      .slice(0, 60);
  }, [personas, search, assignedPersonaIds, unavailableByPersonaId]);

  const closeModal = () => {
    if (replacing) return;
    setModalTarget(null);
    setAddTarget(null);
    setSearch("");
  };

  const handleConfirm = async (posicionamientoId: number) => {
    setProcessingId(posicionamientoId);

    try {
      const updated = await fetchJson<PosicionamientoApi>(
        `/api/posicionamiento/${posicionamientoId}/confirmar`,
        {
          method: "PATCH",
        }
      );

      setPosicionamientos((prev) =>
        prev.map((item) =>
          item.id === posicionamientoId
            ? {
                ...item,
                ...updated,
                persona: updated.persona || item.persona,
              }
            : item
        )
      );
    } catch (confirmError) {
      alert(
        confirmError instanceof Error
          ? confirmError.message
          : "No se pudo confirmar la convocatoria."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemove = async (posicionamiento: PosicionamientoApi) => {
    const confirmed = window.confirm(
      "Esto va a quitar a la persona de este puesto. ¿Querés continuar?"
    );

    if (!confirmed) return;

    setProcessingId(posicionamiento.id);

    try {
      await fetchJson(
        `/api/posicionamiento/evento/${eventoId}/dotacion/${posicionamiento.dotacion_id}/slot/${posicionamiento.slot_index}`,
        {
          method: "DELETE",
        }
      );

      setPosicionamientos((prev) =>
        prev.filter((item) => item.id !== posicionamiento.id)
      );
      setTodosPosicionamientos((prev) =>
        prev.filter((item) => item.id !== posicionamiento.id)
      );
    } catch (removeError) {
      alert(
        removeError instanceof Error
          ? removeError.message
          : "No se pudo quitar la persona."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddPersona = async (persona: Persona) => {
    if (!addTarget) return;

    const dotacionId = addTarget.items[0]?.dotacion_id;
    const dotacion = dotaciones.find((item) => item.id === dotacionId);

    if (!dotacion) {
      alert("No se encontró la dotación de este bloque.");
      return;
    }

    setReplacing(true);

    try {
      const occupiedSlots = new Set(
        posicionamientos
          .filter((item) => item.dotacion_id === dotacion.id)
          .map((item) => item.slot_index)
      );
      let slotIndex = -1;

      for (let index = 0; index < dotacion.cantidad_requerida; index += 1) {
        if (!occupiedSlots.has(index)) {
          slotIndex = index;
          break;
        }
      }

      if (slotIndex === -1) {
        slotIndex = dotacion.cantidad_requerida;

        await fetchJson(`/api/dotacion/${dotacion.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cantidad_requerida: dotacion.cantidad_requerida + 1,
          }),
        });

        setDotaciones((prev) =>
          prev.map((item) =>
            item.id === dotacion.id
              ? { ...item, cantidad_requerida: item.cantidad_requerida + 1 }
              : item
          )
        );
      }

      const created = await fetchJson<PosicionamientoApi>("/api/posicionamiento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evento_id: eventoId,
          dotacion_id: dotacion.id,
          persona_id: persona.id,
          slot_index: slotIndex,
          puesto: dotacion.puesto,
          hora_inicio: dotacion.hora_ingreso,
          hora_fin: dotacion.hora_egreso,
        }),
      });

      const nuevoPosicionamiento = {
        ...created,
        persona: created.persona || persona,
      };

      setPosicionamientos((prev) => [...prev, nuevoPosicionamiento]);
      setTodosPosicionamientos((prev) => [...prev, nuevoPosicionamiento]);
      setAddTarget(null);
      setSearch("");
    } catch (addError) {
      alert(
        addError instanceof Error
          ? addError.message
          : "No se pudo agregar la persona."
      );
    } finally {
      setReplacing(false);
    }
  };

  const handleReplace = async (persona: Persona) => {
    if (!modalTarget) return;

    setReplacing(true);
    setProcessingId(modalTarget.id);

    try {
      const updated = await fetchJson<PosicionamientoApi>(
        `/api/posicionamiento/${modalTarget.id}/reemplazar`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            persona_id: persona.id,
          }),
        }
      );

      setPosicionamientos((prev) =>
        prev.map((item) =>
          item.id === modalTarget.id
            ? {
                ...item,
                ...updated,
                persona: updated.persona || persona,
              }
            : item
        )
      );
      setTodosPosicionamientos((prev) =>
        prev.map((item) =>
          item.id === modalTarget.id
            ? {
                ...item,
                ...updated,
                persona: updated.persona || persona,
              }
            : item
        )
      );

      setModalTarget(null);
      setSearch("");
    } catch (replaceError) {
      alert(
        replaceError instanceof Error
          ? replaceError.message
          : "No se pudo realizar el reemplazo."
      );
    } finally {
      setReplacing(false);
      setProcessingId(null);
    }
  };

  const isAddModal = Boolean(addTarget) && !modalTarget;

  const handleDownloadPosicionamiento = () => {
    const bodyRows = grupos.flatMap((grupo) => {
      const headerRow = `
        <tr class="group-row">
          <td></td>
          <td>${escapeHtml(grupo.puesto)}</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;

      const personaRows = grupo.items.map((item) => {
        const horario =
          item.hora_inicio || item.hora_fin
            ? `${item.hora_inicio || "--:--"} a ${item.hora_fin || "--:--"}`
            : "";

        return `
          <tr>
            <td>${escapeHtml(item.persona?.cuil || "")}</td>
            <td>${escapeHtml(buildPersonaName(item.persona))}</td>
            <td class="centered">${escapeHtml(horario)}</td>
            <td class="centered">${escapeHtml(calculateHours(item.hora_inicio, item.hora_fin))}</td>
            <td></td>
          </tr>
        `;
      });

      return [headerRow, ...personaRows];
    });

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 12px; }
            th, td { border: 0.5pt solid #666; padding: 3px 6px; }
            th { background: #a6a6a6; font-weight: 700; text-align: center; }
            .event-row td { background: #d9d9d9; font-weight: 700; }
            .group-row td { background: #c9c9c9; font-weight: 700; }
            .cuil { width: 120px; }
            .nombre { width: 330px; }
            .horario { width: 110px; }
            .horas { width: 55px; }
            .obs { width: 180px; }
            .centered { text-align: center; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr class="event-row">
                <td colspan="5">
                  Evento: ${escapeHtml(evento?.nombre_evento || "-")} -
                  Fecha: ${escapeHtml(evento ? formatDate(evento.fecha_evento) : "-")} -
                  Salón: ${escapeHtml(evento?.salon || "-")}
                </td>
              </tr>
              <tr>
                <th class="cuil">CUIL</th>
                <th class="nombre">NOMBRE</th>
                <th class="horario centered">HORARIO</th>
                <th class="horas centered">Cant hs</th>
                <th class="obs">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${bodyRows.join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${buildDownloadFileName(evento)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPlanillaPagos = () => {
    const posicionamientosBySlot = new Map<string, PosicionamientoApi>();
    const proveedor = "SGP";
    const clientePlanilla = getPlanillaCliente(evento);

    posicionamientos.forEach((item) => {
      posicionamientosBySlot.set(`${item.dotacion_id}-${item.slot_index}`, item);
    });

    let totalPago = 0;

    const bodyRows = dotaciones.flatMap((dotacion) => {
      const horasPago = getPaymentHours(dotacion);
      const valorHora = getPuestoValor(dotacion.puesto);

      return Array.from({ length: dotacion.cantidad_requerida }).flatMap((_, slotIndex) => {
        const posicionamiento = posicionamientosBySlot.get(`${dotacion.id}-${slotIndex}`);
        const persona = posicionamiento?.persona || null;

        if (isPersonaFija(persona)) {
          return [];
        }

        const pago =
          persona && horasPago !== null && valorHora > 0
            ? Math.round(valorHora * horasPago)
            : null;

        if (pago !== null) {
          totalPago += pago;
        }

        return [`
          <tr>
            <td class="date">${escapeHtml(evento ? formatDate(evento.fecha_evento) : "")}</td>
            <td class="event">${escapeHtml(evento?.cliente_evento || evento?.nombre_evento || "")}</td>
            <td class="puesto">${escapeHtml(dotacion.puesto)}</td>
            <td class="centered">${escapeHtml(horasPago ?? "")}</td>
            <td class="centered">${escapeHtml(dotacion.hora_ingreso || "")}</td>
            <td class="centered">${escapeHtml(dotacion.hora_egreso || "")}</td>
            <td class="name">${escapeHtml(buildPersonaPaymentName(persona))}</td>
            <td class="provider">${escapeHtml(proveedor)}</td>
            <td class="client">${escapeHtml(clientePlanilla)}</td>
            <td class="payment">${pago === null ? "-" : `$ ${escapeHtml(formatMoney(pago))}`}</td>
          </tr>
        `];
      });
    });

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 12px; }
            th, td { border: 0.5pt solid #000; padding: 2px 4px; white-space: nowrap; }
            th { background: #d9d9d9; font-weight: 700; text-align: center; }
            .top-left { background: #bdd7ee; height: 38px; }
            .title { font-size: 26px; font-weight: 700; text-align: center; text-decoration: underline; }
            .total { font-size: 24px; font-weight: 700; text-align: center; }
            .spacer td { height: 16px; border-left: 0.5pt solid #000; border-right: 0.5pt solid #000; }
            .date { width: 85px; }
            .event { width: 230px; background: #d9d9d9; }
            .puesto { width: 155px; }
            .name { width: 330px; }
            .provider { width: 85px; text-align: center; background: #d9d9d9; }
            .client { width: 110px; text-align: center; background: #d9d9d9; }
            .payment { width: 110px; text-align: right; background: #d9d9d9; }
            .centered { text-align: center; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <td class="top-left" colspan="2">
                  ${escapeHtml(evento ? formatDate(evento.fecha_evento) : "")}
                  ${escapeHtml(evento?.cliente_evento || evento?.nombre_evento || "")}
                </td>
                <td class="title" colspan="5">
                  Posicionamiento&nbsp;&nbsp;-&nbsp;&nbsp;${escapeHtml(evento ? formatDate(evento.fecha_evento).replaceAll("/", "-") : "")}
                  ${escapeHtml(evento?.cliente_evento || evento?.nombre_evento || "")}
                </td>
                <td class="total" colspan="3">$${escapeHtml(formatIntegerMoney(totalPago))}</td>
              </tr>
              <tr class="spacer">
                <td colspan="10"></td>
              </tr>
              <tr>
                <th>Fecha</th>
                <th>Evento</th>
                <th>Puesto</th>
                <th>Jornada</th>
                <th>Hr Ingreso</th>
                <th>Hr Egreso</th>
                <th>Nombre operativo</th>
                <th>Proveedor</th>
                <th>Cliente</th>
                <th>Pago</th>
              </tr>
            </thead>
            <tbody>
              ${bodyRows.join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `planilla_pagos_${buildDownloadFileName(evento)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="text-slate-500">Cargando convocatoria...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <>
      <div className="min-h-[calc(100vh-7rem)] space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Convocatoria del evento
            </h1>
            <p className="mt-1 text-slate-500">
              Vista operativa del personal ya posicionado para confirmar y
              gestionar reemplazos.
            </p>
          </div>

          <div ref={actionsRef} className="relative">
            <button
              type="button"
              onClick={() => setActionsOpen((current) => !current)}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Acciones
            </button>

            {actionsOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    handleDownloadPosicionamiento();
                  }}
                  disabled={posicionamientos.length === 0}
                  className={`block w-full px-4 py-3 text-left text-sm ${
                    posicionamientos.length === 0
                      ? "cursor-not-allowed text-slate-400"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Descargar posicionamiento
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    handleDownloadPlanillaPagos();
                  }}
                  disabled={dotaciones.length === 0}
                  className={`block w-full px-4 py-3 text-left text-sm ${
                    dotaciones.length === 0
                      ? "cursor-not-allowed text-slate-400"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Descargar planilla de pagos
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    router.push("/eventos");
                  }}
                  className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Volver a eventos
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="flex min-h-14 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 lg:col-span-2">
              <p className="text-sm font-semibold text-slate-900">
                {evento?.nombre_evento || "-"}
                <span className="mx-2 text-slate-300">-</span>
                <span className="font-bold">
                  {evento ? formatDate(evento.fecha_evento) : "-"}
                </span>
                <span className="mx-2 text-slate-300">-</span>
                <span className="font-normal text-slate-500">
                  {evento?.salon || "-"}
                </span>
              </p>
            </div>

            <div className="flex min-h-14 flex-col justify-center rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5">
              <p className="text-xs text-emerald-700">Confirmados</p>
              <p className="mt-0.5 text-lg font-semibold text-emerald-900">
                {totalConfirmados}
              </p>
            </div>

            <div className="flex min-h-14 flex-col justify-center rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
              <p className="text-xs text-amber-700">Pendientes</p>
              <p className="mt-0.5 text-lg font-semibold text-amber-900">
                {totalPendientes}
              </p>
            </div>
          </div>

        </div>

        {posicionamientos.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              No hay personal posicionado
            </h2>
            <p className="mt-2 text-slate-500">
              Primero completá el posicionamiento del evento para poder convocar al
              personal.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/eventos/${eventoId}/posicionamiento`)}
              className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ir a posicionamiento
            </button>
          </div>
        ) : (
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

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                      {grupo.items.filter((item) => item.confirmado).length} confirmados
                    </span>
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                      {grupo.items.filter((item) => !item.confirmado).length} pendientes
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAddTarget(grupo);
                        setModalTarget(null);
                        setSearch("");
                      }}
                      title="Agregar personal"
                      aria-label="Agregar personal al bloque"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-base font-semibold text-white transition hover:bg-sky-500"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-200">
                  {grupo.items.map((item) => {
                    const isProcessing = processingId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-4 px-5 py-4 xl:flex-row xl:items-center xl:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-slate-900">
                              {buildPersonaLabel(item.persona)}
                            </p>


                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                item.confirmado
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {item.confirmado ? "Confirmado" : "Pendiente"}
                            </span>
                          </div>

                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirm(item.id)}
                            title={item.confirmado ? "Marcar pendiente" : "Confirmar"}
                            aria-label={
                              item.confirmado
                                ? "Marcar como pendiente"
                                : "Confirmar"
                            }
                            disabled={isProcessing}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-base font-semibold transition ${
                              isProcessing
                                  ? "cursor-not-allowed bg-slate-200 text-slate-500"
                                  : item.confirmado
                                    ? "border border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                            }`}
                          >
                            ✓
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setModalTarget(item);
                              setSearch("");
                            }}
                            title="Reemplazar"
                            aria-label="Reemplazar persona"
                            disabled={isProcessing}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-base font-semibold transition ${
                              isProcessing
                                ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                                : "border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200"
                            }`}
                          >
                            ⇄
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            title="Quitar"
                            aria-label="Quitar persona"
                            disabled={isProcessing}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-base font-semibold transition ${
                              isProcessing
                                ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                                : "border-red-200 bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {modalTarget || addTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {isAddModal ? "Agregar personal" : "Reemplazar personal"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Elegí a la persona que va a ocupar esta convocatoria en forma
                  vigente.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={replacing}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto px-6 py-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">
                  {isAddModal ? "Agregando en" : "Reemplazando a"}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {isAddModal
                    ? addTarget?.puesto || "-"
                    : buildPersonaLabel(modalTarget?.persona || null)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {isAddModal
                    ? addTarget?.horario || "-"
                    : `${modalTarget?.puesto || "-"} - ${formatHorario(
                        modalTarget?.hora_inicio || null,
                        modalTarget?.hora_fin || null
                      )}`}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Buscar en el maestro de personal
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Legajo, apellido o nombre..."
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
                />
              </div>

              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500">
                  Resultados del maestro real de personal
                </div>

                <div className="max-h-[420px] divide-y divide-slate-200 overflow-y-auto">
                  {filteredPersonas.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500">
                      No se encontraron personas para esa búsqueda.
                    </div>
                  ) : (
                    filteredPersonas.map((persona) => {
                      const isCurrent = modalTarget
                        ? persona.id === modalTarget.persona_id
                        : false;
                      const alreadyAssigned =
                        assignedPersonaIds.has(persona.id) && !isCurrent;
                      const unavailableEvent = unavailableByPersonaId.get(persona.id);
                      const disabled =
                        isCurrent ||
                        alreadyAssigned ||
                        Boolean(unavailableEvent) ||
                        replacing;

                      return (
                        <div
                          key={persona.id}
                          className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">
                              {buildPersonaLabel(persona)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {buildPersonaMeta(persona)}
                            </p>
                            {unavailableEvent ? (
                              <p className="mt-1 text-[11px] text-red-600">
                                {formatUnavailableEvent(unavailableEvent)}
                              </p>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              isAddModal
                                ? handleAddPersona(persona)
                                : handleReplace(persona)
                            }
                            disabled={disabled}
                            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                              disabled
                                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                                : "bg-slate-900 text-white hover:bg-slate-800"
                            }`}
                          >
                            {isCurrent
                              ? "Personal actual"
                              : alreadyAssigned
                                ? "Ya asignado en este evento"
                                : unavailableEvent
                                  ? "No disponible"
                                : replacing
                                  ? "Asignando..."
                                   : isAddModal
                                     ? "Agregar"
                                     : "Seleccionar"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={replacing}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

