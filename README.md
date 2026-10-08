# LaundryWeb

MVP administrativo de Laundry Fresh construido con React, TypeScript, Vite y Tailwind CSS.

## Navegación lateral

El layout usa un menú fijado de 260 px o compacto de 60 px desde 1024 px. La preferencia se guarda en `cfl.sidebar.collapsed`; la vista temporal por cursor o teclado mantiene el margen compacto y se cierra con Escape o después de 150 ms al salir. Por debajo de 1024 px, el botón superior abre un cajón con fondo, foco contenido y cierre al navegar. Los módulos conservan los permisos por rol y expanden la sección de la ruta actual.

`MainLayout.tsx` sincroniza el margen; los hooks `useSidebarState`, `useSidebarHover` y `useExpandedModules` gestionan cada interacción. `PrefetchNavLink` anticipa las páginas de carga diferida al enfocarlas o pasar el cursor. El diseño usa únicamente fondos claros, Lucide y los logotipos oficiales de `assets/`. Ctrl/Cmd + K abre la búsqueda global.

Para verificar la navegación: `npm run lint`, `npm run build` y `npx playwright test tests/sidebar.spec.cjs` con el navegador de Playwright instalado. Si se usa Edge, establecer `PLAYWRIGHT_CHANNEL=msedge`.

Consulta la [guía del nuevo flujo y transferencias QR](FULFILLMENT-MVP.md) para ejecutar los recorridos a domicilio y en sede desde Recepción y retiros.

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

## Modalidades vigentes

Solo se ofrecen **domicilio completo** (recogida y entrega a domicilio) y **pick up** (recogida a domicilio y retiro del cliente en sede). La entrega inicial del cliente en el local no está disponible. Los pedidos guardados con ingreso pendiente requieren confirmar una recogida a domicilio; se conservan pagos y constancias anteriores.
