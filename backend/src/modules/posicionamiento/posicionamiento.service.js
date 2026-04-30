const pool = require("../../config/db");
const posicionamientoRepository = require("./posicionamiento.repository");
const eventosService = require("../eventos/eventos.service");
const dotacionService = require("../dotacion/dotacion.service");
const personasService = require("../personas/personas.service");

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const normalizeAsistenciaEstado = (value) => {
  const estado = normalizeText(value) || "pendiente";
  const estadosValidos = ["pendiente", "presente", "ausente"];

  if (!estadosValidos.includes(estado)) {
    const error = new Error("El estado de asistencia no es válido");
    error.status = 400;
    throw error;
  }

  return estado;
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const rangesOverlap = (startA, endA, startB, endB) => {
  return startA < endB && endA > startB;
};

const attachPersonaData = async (posicionamientos) => {
  const personas = await personasService.getAllPersonasForPosicionamiento();
  const personasMap = new Map(personas.map((persona) => [Number(persona.id), persona]));

  return posicionamientos.map((posicionamiento) => ({
    ...posicionamiento,
    persona: personasMap.get(Number(posicionamiento.persona_id)) || null,
  }));
};

const validatePersonaNoOverlap = async (
  personaId,
  fechaEvento,
  horaInicio,
  horaFin,
  excludePosicionamientoId = null
) => {
  const posicionamientosPersona =
    await posicionamientoRepository.getByPersonaId(personaId);

  const inicioNuevo = timeToMinutes(horaInicio);
  const finNuevo = timeToMinutes(horaFin);

  for (const pos of posicionamientosPersona) {
    if (
      excludePosicionamientoId !== null &&
      Number(pos.id) === Number(excludePosicionamientoId)
    ) {
      continue;
    }

    const eventoExistente = await eventosService.getEventoById(pos.evento_id);

    if (eventoExistente.fecha_evento !== fechaEvento) continue;

    const inicioExistente = timeToMinutes(pos.hora_inicio);
    const finExistente = timeToMinutes(pos.hora_fin);

    if (
      rangesOverlap(inicioNuevo, finNuevo, inicioExistente, finExistente)
    ) {
      const error = new Error(
        "La persona ya está asignada en otro evento en ese horario"
      );
      error.status = 400;
      throw error;
    }
  }
};

const validatePersonaSinOtroEventoMismoDia = async (
  personaId,
  eventoId,
  fechaEvento,
  excludePosicionamientoId = null
) => {
  const posicionamientosPersona =
    await posicionamientoRepository.getByPersonaId(personaId);

  for (const pos of posicionamientosPersona) {
    if (
      excludePosicionamientoId !== null &&
      Number(pos.id) === Number(excludePosicionamientoId)
    ) {
      continue;
    }

    if (Number(pos.evento_id) === Number(eventoId)) continue;

    const eventoExistente = await eventosService.getEventoById(pos.evento_id);

    if (eventoExistente.fecha_evento === fechaEvento) {
      const error = new Error(
        "La persona ya est\u00e1 asignada a otro evento ese mismo d\u00eda"
      );
      error.status = 400;
      throw error;
    }
  }
};

const getPosicionamientoById = async (id, client = pool) => {
  const posicionamiento = await posicionamientoRepository.getById(id, client);

  if (!posicionamiento) {
    const error = new Error("Posicionamiento no encontrado");
    error.status = 404;
    throw error;
  }

  return posicionamiento;
};

const validatePersonaDisponibleEnEvento = async (
  eventoId,
  personaId,
  excludePosicionamientoId = null,
  client = pool
) => {
  const coincidencias = await posicionamientoRepository.getByEventoAndPersona(
    eventoId,
    personaId,
    excludePosicionamientoId,
    client
  );

  if (coincidencias.length > 0) {
    const error = new Error("La persona ya est\u00e1 asignada en este evento");
    error.status = 400;
    throw error;
  }
};

const getAllPosicionamientos = async () => {
  const posicionamientos = await posicionamientoRepository.getAll();
  return attachPersonaData(posicionamientos);
};

const getPosicionamientosByEventoId = async (eventoId) => {
  await eventosService.getEventoById(eventoId);
  const posicionamientos = await posicionamientoRepository.getByEventoId(eventoId);
  return attachPersonaData(posicionamientos);
};

const createPosicionamiento = async (data) => {
  const evento_id = normalizeNumber(data.evento_id);
  const dotacion_id = normalizeNumber(data.dotacion_id);
  const persona_id = normalizeNumber(data.persona_id);
  const slot_index = normalizeNumber(data.slot_index);
  const puesto = normalizeText(data.puesto);
  const hora_inicio = normalizeText(data.hora_inicio);
  const hora_fin = normalizeText(data.hora_fin);

  if (
    !evento_id ||
    !dotacion_id ||
    !persona_id ||
    slot_index === null ||
    !puesto
  ) {
    const error = new Error(
      "evento_id, dotacion_id, persona_id, slot_index y puesto son obligatorios"
    );
    error.status = 400;
    throw error;
  }

  const evento = await eventosService.getEventoById(evento_id);
  const persona = await personasService.getPersonaById(persona_id);
  const dotacion = await dotacionService.getDotacionById(dotacion_id);

  if (!persona.activo) {
    const error = new Error("La persona no está activa");
    error.status = 400;
    throw error;
  }

  if (dotacion.evento_id !== evento_id) {
    const error = new Error("La dotación no pertenece al evento indicado");
    error.status = 400;
    throw error;
  }

  if (slot_index >= dotacion.cantidad_requerida) {
    const error = new Error("El slot seleccionado no existe en la dotación");
    error.status = 400;
    throw error;
  }

  if (!persona.activo) {
    const error = new Error("La persona no está activa");
    error.status = 400;
    throw error;
  }

  const slotOcupado = await posicionamientoRepository.getByDotacionAndSlot(
    dotacion_id,
    slot_index
  );

  if (slotOcupado) {
    const error = new Error("Ese slot ya tiene una persona asignada");
    error.status = 400;
    throw error;
  }

  await validatePersonaDisponibleEnEvento(evento_id, persona_id);
  await validatePersonaSinOtroEventoMismoDia(
    persona_id,
    evento_id,
    evento.fecha_evento
  );

  if (hora_inicio && hora_fin) {
    await validatePersonaNoOverlap(
      persona_id,
      evento.fecha_evento,
      hora_inicio,
      hora_fin
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const nuevoPosicionamiento = await posicionamientoRepository.create(
      {
        evento_id,
        dotacion_id,
        persona_id,
        puesto,
        hora_inicio,
        hora_fin,
        slot_index,
        confirmado: false,
        reemplazo_desde_persona_id: null,
        estado: normalizeText(data.estado) || "asignado",
      },
      client
    );

    await client.query("COMMIT");

    return {
      ...nuevoPosicionamiento,
      persona,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const removePosicionamiento = async (eventoId, dotacionId, slotIndex) => {
  await eventosService.getEventoById(eventoId);
  const dotacion = await dotacionService.getDotacionById(dotacionId);

  if (dotacion.evento_id !== Number(eventoId)) {
    const error = new Error("La dotación no pertenece al evento indicado");
    error.status = 400;
    throw error;
  }

  const removed = await posicionamientoRepository.removeByDotacionAndSlot(
    dotacionId,
    slotIndex
  );

  if (!removed) {
    const error = new Error("No existe una asignación en ese slot");
    error.status = 404;
    throw error;
  }

  return removed;
};

const confirmPosicionamiento = async (posicionamientoId) => {
  const posicionamiento = await getPosicionamientoById(posicionamientoId);
  const persona = await personasService.getPersonaById(posicionamiento.persona_id);

  const actualizado = await posicionamientoRepository.updateConfirmado(
    posicionamientoId,
    !posicionamiento.confirmado
  );

  return {
    ...actualizado,
    persona,
  };
};

const replacePosicionamientoPersona = async (posicionamientoId, personaId) => {
  const nuevaPersonaId = normalizeNumber(personaId);

  if (!nuevaPersonaId) {
    const error = new Error("persona_id es obligatorio");
    error.status = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const posicionamiento = await getPosicionamientoById(posicionamientoId, client);
    const evento = await eventosService.getEventoById(posicionamiento.evento_id);
    const nuevaPersona = await personasService.getPersonaById(nuevaPersonaId);

    if (!nuevaPersona.activo) {
      const error = new Error("La persona no est\u00e1 activa");
      error.status = 400;
      throw error;
    }

    if (Number(posicionamiento.persona_id) === Number(nuevaPersonaId)) {
      const error = new Error("La persona seleccionada ya ocupa esta posici\u00f3n");
      error.status = 400;
      throw error;
    }

    await validatePersonaDisponibleEnEvento(
      posicionamiento.evento_id,
      nuevaPersonaId,
      posicionamiento.id,
      client
    );
    await validatePersonaSinOtroEventoMismoDia(
      nuevaPersonaId,
      posicionamiento.evento_id,
      evento.fecha_evento,
      posicionamiento.id
    );

    if (posicionamiento.hora_inicio && posicionamiento.hora_fin) {
      await validatePersonaNoOverlap(
        nuevaPersonaId,
        evento.fecha_evento,
        posicionamiento.hora_inicio,
        posicionamiento.hora_fin,
        posicionamiento.id
      );
    }

    const actualizado = await posicionamientoRepository.replacePersona(
      posicionamiento.id,
      nuevaPersonaId,
      client
    );

    await client.query("COMMIT");

    return {
      ...actualizado,
      persona: nuevaPersona,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateAsistenciaPosicionamiento = async (posicionamientoId, data) => {
  const posicionamiento = await getPosicionamientoById(posicionamientoId);
  const persona = await personasService.getPersonaById(posicionamiento.persona_id);
  const horasDescontadas = normalizeNumber(data.horas_descontadas) || 0;

  if (horasDescontadas < 0) {
    const error = new Error("Las horas descontadas no pueden ser negativas");
    error.status = 400;
    throw error;
  }

  const actualizado = await posicionamientoRepository.updateAsistencia(
    posicionamientoId,
    {
      asistencia_estado: normalizeAsistenciaEstado(data.asistencia_estado),
      hora_real_inicio: normalizeText(data.hora_real_inicio),
      hora_real_fin: normalizeText(data.hora_real_fin),
      horas_descontadas: horasDescontadas,
      observacion_asistencia: normalizeText(data.observacion_asistencia),
    }
  );

  return {
    ...actualizado,
    persona,
  };
};

module.exports = {
  getAllPosicionamientos,
  getPosicionamientosByEventoId,
  createPosicionamiento,
  removePosicionamiento,
  confirmPosicionamiento,
  replacePosicionamientoPersona,
  updateAsistenciaPosicionamiento,
};
