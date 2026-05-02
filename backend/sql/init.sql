CREATE TABLE IF NOT EXISTS eventos (
  id SERIAL PRIMARY KEY,
  nombre_evento TEXT NOT NULL,
  fecha_evento DATE NOT NULL,
  salon TEXT NOT NULL,
  cliente_evento TEXT NOT NULL,
  unidad_imputacion TEXT,
  pagador_real TEXT NOT NULL DEFAULT 'SGP',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dotaciones (
  id SERIAL PRIMARY KEY,
  evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  puesto TEXT NOT NULL,
  cantidad_base INTEGER NOT NULL CHECK (cantidad_base >= 0),
  cantidad_requerida INTEGER NOT NULL CHECK (cantidad_requerida >= cantidad_base),
  hora_ingreso TEXT,
  hora_egreso TEXT,
  jornada_horas NUMERIC(10, 2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posicionamientos (
  id SERIAL PRIMARY KEY,
  evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  dotacion_id INTEGER NOT NULL REFERENCES dotaciones(id) ON DELETE CASCADE,
  persona_id INTEGER NOT NULL,
  puesto TEXT NOT NULL,
  hora_inicio TEXT,
  hora_fin TEXT,
  slot_index INTEGER NOT NULL CHECK (slot_index >= 0),
  confirmado BOOLEAN NOT NULL DEFAULT FALSE,
  reemplazo_desde_persona_id INTEGER,
  estado TEXT NOT NULL DEFAULT 'asignado',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (dotacion_id, slot_index)
);

CREATE TABLE IF NOT EXISTS personas (
  id INTEGER PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personas_legajo
ON personas ((data->>'legajo'));

CREATE INDEX IF NOT EXISTS idx_personas_cuil
ON personas ((data->>'cuil'));

ALTER TABLE posicionamientos
ADD COLUMN IF NOT EXISTS confirmado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE posicionamientos
ADD COLUMN IF NOT EXISTS reemplazo_desde_persona_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_dotaciones_evento_id
ON dotaciones(evento_id);

CREATE INDEX IF NOT EXISTS idx_posicionamientos_evento_id
ON posicionamientos(evento_id);

CREATE INDEX IF NOT EXISTS idx_posicionamientos_persona_id
ON posicionamientos(persona_id);
