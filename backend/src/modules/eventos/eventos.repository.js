const pool = require("../../config/db");

const mapEventoRow = (row) => ({
  ...row,
  id: Number(row.id),
  fecha_evento: row.fecha_evento
    ? new Date(row.fecha_evento).toISOString().slice(0, 10)
    : null,
});

const getAll = async () => {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM eventos
      ORDER BY fecha_evento DESC, id DESC
    `
  );

  return rows.map(mapEventoRow);
};

const getById = async (id) => {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM eventos
      WHERE id = $1
    `,
    [id]
  );

  return rows[0] ? mapEventoRow(rows[0]) : null;
};

const create = async (evento, client = pool) => {
  const { rows } = await client.query(
    `
      INSERT INTO eventos (
        nombre_evento,
        fecha_evento,
        salon,
        cliente_evento,
        unidad_imputacion,
        pagador_real,
        estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      evento.nombre_evento,
      evento.fecha_evento,
      evento.salon,
      evento.cliente_evento,
      evento.unidad_imputacion,
      evento.pagador_real,
      evento.estado,
    ]
  );

  return mapEventoRow(rows[0]);
};

const updateEstado = async (id, estado, client = pool) => {
  const { rows } = await client.query(
    `
      UPDATE eventos
      SET estado = $2
      WHERE id = $1
      RETURNING *
    `,
    [Number(id), estado]
  );

  return rows[0] ? mapEventoRow(rows[0]) : null;
};

module.exports = {
  getAll,
  getById,
  create,
  updateEstado,
};
