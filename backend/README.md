# SGP RRHH - Backend

API REST para el Sistema SGP.

## Requisitos

- Node.js 16+
- PostgreSQL 12+
- npm o yarn

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Crear archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

3. Completar las variables de entorno en `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sgp_rrhh
DB_USER=postgres
DB_PASSWORD=tu_contraseña
JWT_SECRET=un-secreto-seguro-y-largo
CORS_ORIGIN=http://localhost:3000
```

4. Ejecutar migraciones de base de datos (se ejecutan automáticamente al iniciar):
```bash
npm run dev
```

## Scripts disponibles

- `npm run dev` - Inicia el servidor en modo desarrollo con nodemon
- `npm start` - Inicia el servidor en producción
- `npm run import:personal-fijo` - Importa datos de personal fijo

## Estructura del proyecto

```
src/
├── app.js              # Configuración de Express
├── server.js           # Punto de entrada
├── config/             # Configuración (DB, env, etc)
├── middlewares/        # Middlewares (auth, errors)
└── modules/            # Módulos por funcionalidad
    ├── auth/
    ├── usuarios/
    ├── personas/
    ├── eventos/
    ├── dotacion/
    └── posicionamiento/
```

## Rutas de la API

### Autenticación (Públicas)
- `POST /api/auth/login` - Iniciar sesión

### Rutas protegidas (requieren token JWT)
- `GET /api/usuarios` - Listar usuarios
- `GET /api/personas` - Listar personas
- `GET /api/eventos` - Listar eventos
- `POST /api/eventos` - Crear evento
- `GET /api/dotacion` - Listar dotaciones
- `GET /api/posicionamiento` - Listar posicionamientos

## Autenticación

El API utiliza JWT (JSON Web Tokens) para autenticación.

1. Enviar credenciales a `/api/auth/login`
2. Recibir token en la respuesta
3. Incluir token en el header `Authorization: Bearer <token>` en requests posteriores

## Desarrollo

Para desarrollo local con hot-reload:
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3001`

## Producción

1. Compilar (si aplica)
2. Configurar variables de entorno en el servidor
3. Ejecutar:
```bash
npm run start
```

## Seguridad

- Las contraseñas se hashean con bcryptjs
- JWT se valida en rutas protegidas
- CORS está restringido al origen del frontend
- Variables sensibles se leen desde `.env` (nunca commitear)
