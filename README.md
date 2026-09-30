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

El MVP no requiere variables de entorno: actualmente utiliza datos de demostracion persistidos en `localStorage`. El archivo `.env.example` conserva variables reservadas para una futura integracion con servicios externos.

## Verificacion

```bash
npm run lint
npm run build
npm run preview
```

Para eliminar el build generado:

```bash
npm run clean
```
