const pool = require("../../config/db");

const mapPosicionamientoRow = (row) => ({
  ...row,
  id: Number(row.id),
  evento_id: Number(row.evento_id),
  dotacion_id: Number(row.dotacion_id),
  persona_id: Number(row.persona_id),
  slot_index: Number(row.slot_index),
  confirmado: Boolean(row.confirmado),
  reemplazo_desde_persona_id:
    row.reemplazo_desde_persona_id === null ||
    row.reemplazo_desde_persona_id === undefined
      ? null
      : Number(row.reemplazo_desde_persona_id),
  horas_descontadas:
    row.horas_descontadas === null || row.horas_descontadas === undefined
      ? 0
      : Number(row.horas_descontadas),
});

const getAll = async () => {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM posicionamientos
      ORDER BY evento_id, dotacion_id, slot_index
    `
  );

  return rows.map(mapPosicionamientoRow);
};

const getByEventoId = async (eventoId) => {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM posicionamientos
      WHERE evento_id = $1
      ORDER BY dotacion_id, slot_index
    `,
    [Number(eventoId)]
  );

  return rows.map(mapPosicionamientoRow);
};

const getByPersonaId = async (personaId) => {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM posicionamientos
      WHERE persona_id = $1
      ORDER BY evento_id, slot_index
    `,
    [Number(personaId)]
  );

  return rows.map(mapPosicionamientoRow);
};

const getById = async (id, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT *
      FROM posicionamientos
      WHERE id = $1
    `,
    [Number(id)]
  );

  return rows[0] ? mapPosicionamientoRow(rows[0]) : null;
};

const getByEventoAndPersona = async (
  eventoId,
  personaId,
  excludePosicionamientoId = null,
  client = pool
) => {
  const values = [Number(eventoId), Number(personaId)];
  let query = `
    SELECT *
    FROM posicionamientos
    WHERE evento_id = $1 AND persona_id = $2
  `;

  if (excludePosicionamientoId !== null && excludePosicionamientoId !== undefined) {
    values.push(Number(excludePosicionamientoId));
    query += " AND id <> $3";
  }

  query += " ORDER BY dotacion_id, slot_index";

  const { rows } = await client.query(query, values);
  return rows.map(mapPosicionamientoRow);
};

const getByDotacionAndSlot = async (dotacionId, slotIndex, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT *
      FROM posicionamientos
      WHERE dotacion_id = $1 AND slot_index = $2
    `,
    [Number(dotacionId), Number(slotIndex)]
  );

  return rows[0] ? mapPosicionamientoRow(rows[0]) : null;
};

const create = async (posicionamiento, client = pool) => {
  const { rows } = await client.query(
    `
      INSERT INTO posicionamientos (
        evento_id,
        dotacion_id,
        persona_id,
        puesto,
        hora_inicio,
        hora_fin,
        slot_index,
        confirmado,
        reemplazo_desde_persona_id,
        estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    [
      posicionamiento.evento_id,
      posicionamiento.dotacion_id,
      posicionamiento.persona_id,
      posicionamiento.puesto,
      posicionamiento.hora_inicio,
      posicionamiento.hora_fin,
      posicionamiento.slot_index,
      Boolean(posicionamiento.confirmado),
      posicionamiento.reemplazo_desde_persona_id ?? null,
      posicionamiento.estado,
    ]
  );

  return mapPosicionamientoRow(rows[0]);
};

const removeByDotacionAndSlot = async (dotacionId, slotIndex, client = pool) => {
  const { rows } = await client.query(
    `
      DELETE FROM posicionamientos
      WHERE dotacion_id = $1 AND slot_index = $2
      RETURNING *
    `,
    [Number(dotacionId), Number(slotIndex)]
  );

  return rows[0] ? mapPosicionamientoRow(rows[0]) : null;
};

const updateConfirmado = async (id, confirmado, client = pool) => {
  const { rows } = await client.query(
    `
      UPDATE posicionamientos
      SET confirmado = $2,
          estado = CASE WHEN $2 THEN 'confirmado' ELSE 'asignado' END
      WHERE id = $1
      RETURNING *
    `,
    [Number(id), Boolean(confirmado)]
  );

  return rows[0] ? mapPosicionamientoRow(rows[0]) : null;
};

const replacePersona = async (id, personaId, client = pool) => {
  const { rows } = await client.query(
    `
      UPDATE posicionamientos
      SET reemplazo_desde_persona_id = persona_id,
          persona_id = $2,
          confirmado = FALSE,
          estado = 'asignado'
      WHERE id = $1
      RETURNING *
    `,
    [Number(id), Number(personaId)]
  );

  return rows[0] ? mapPosicionamientoRow(rows[0]) : null;
};

const updateAsistencia = async (id, asistencia, client = pool) => {
  const { rows } = await client.query(
    `
      UPDATE posicionamientos
      SET asistencia_estado = $2,
          hora_real_inicio = $3,
          hora_real_fin = $4,
          horas_descontadas = $5,
          observacion_asistencia = $6
      WHERE id = $1
      RETURNING *
    `,
    [
      Number(id),
      asistencia.asistencia_estado,
      asistencia.hora_real_inicio,
      asistencia.hora_real_fin,
      Number(asistencia.horas_descontadas || 0),
      asistencia.observacion_asistencia,
    ]
  );

  return rows[0] ? mapPosicionamientoRow(rows[0]) : null;
};

module.exports = {
  getAll,
  getByEventoId,
  getByPersonaId,
  getById,
  getByEventoAndPersona,
  getByDotacionAndSlot,
  create,
  removeByDotacionAndSlot,
  updateConfirmado,
  replacePersona,
  updateAsistencia,
};
