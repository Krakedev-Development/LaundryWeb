# LaundryWeb

MVP administrativo de Laundry Fresh construido con React, TypeScript, Vite y Tailwind CSS.

## Requisitos

- Node.js 22.12 o superior (se recomienda Node.js 22 LTS).
- npm 11.

## Instalacion local

```bash
npm install
npm run dev
```

La aplicacion intenta usar `http://localhost:3000`. Si ese puerto esta ocupado, Vite muestra en la terminal el siguiente puerto disponible.

El modo demo conserva datos locales y escenarios de Samborondón sin credenciales. Copia `.env.example` a `.env` y configura Mapbox para mapas, Geocoding v6, Directions y Matrix reales. Consulta [el alcance, configuración y recorrido completo](GEO-MVP.md). LaundryApp y LaundryWeb son demostraciones independientes.

## Verificacion

```bash
npm run lint
npm test
npm run test:ui
npm run build
npm run preview
```

Para eliminar el build generado:

```bash
npm run clean
```
