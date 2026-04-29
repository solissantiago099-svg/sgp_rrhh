const pool = require("../../config/db");

const mapDotacionRow = (row) => ({
  ...row,
  id: Number(row.id),
  evento_id: Number(row.evento_id),
  cantidad_base: Number(row.cantidad_base),
  cantidad_requerida: Number(row.cantidad_requerida),
  cantidad_cubierta: Number(row.cantidad_cubierta || 0),
  cantidad_faltante: Number(row.cantidad_faltante || 0),
  jornada_horas:
    row.jornada_horas === null || row.jornada_horas === undefined
      ? null
      : Number(row.jornada_horas),
});

const baseSelect = `
  SELECT
    d.*,
    COALESCE(c.cantidad_cubierta, 0) AS cantidad_cubierta,
    GREATEST(
      d.cantidad_requerida - COALESCE(c.cantidad_cubierta, 0),
      0
    ) AS cantidad_faltante,
    CASE
      WHEN COALESCE(c.cantidad_cubierta, 0) >= d.cantidad_requerida THEN 'cubierta'
      WHEN COALESCE(c.cantidad_cubierta, 0) > 0 THEN 'cubierta_parcial'
      ELSE 'pendiente'
    END AS estado
  FROM dotaciones d
  LEFT JOIN (
    SELECT dotacion_id, COUNT(*)::int AS cantidad_cubierta
    FROM posicionamientos
    GROUP BY dotacion_id
  ) c ON c.dotacion_id = d.id
`;

const getAll = async () => {
  const { rows } = await pool.query(
    `
      ${baseSelect}
      ORDER BY d.evento_id, d.id
    `
  );

  return rows.map(mapDotacionRow);
};

const getByEventoId = async (eventoId) => {
  const { rows } = await pool.query(
    `
      ${baseSelect}
      WHERE d.evento_id = $1
      ORDER BY d.id
    `,
    [Number(eventoId)]
  );

  return rows.map(mapDotacionRow);
};

const getById = async (id, client = pool) => {
  const { rows } = await client.query(
    `
      ${baseSelect}
      WHERE d.id = $1
    `,
    [Number(id)]
  );

  return rows[0] ? mapDotacionRow(rows[0]) : null;
};

const create = async (dotacion, client = pool) => {
  const { rows } = await client.query(
    `
      INSERT INTO dotaciones (
        evento_id,
        puesto,
        cantidad_base,
        cantidad_requerida,
        hora_ingreso,
        hora_egreso,
        jornada_horas
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    [
      dotacion.evento_id,
      dotacion.puesto,
      dotacion.cantidad_base,
      dotacion.cantidad_requerida,
      dotacion.hora_ingreso,
      dotacion.hora_egreso,
      dotacion.jornada_horas,
    ]
  );

  return getById(rows[0].id, client);
};

const updateCantidadRequerida = async (id, cantidadRequerida, client = pool) => {
  await client.query(
    `
      UPDATE dotaciones
      SET cantidad_requerida = $2
      WHERE id = $1
    `,
    [Number(id), Number(cantidadRequerida)]
  );

  return getById(id, client);
};

module.exports = {
  getAll,
  getByEventoId,
  getById,
  create,
  updateCantidadRequerida,
};
