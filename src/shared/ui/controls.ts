// Estilos compartidos de botones y campos de formulario. Úsalos en lugar de copiar clases en cada
// pantalla: así todos los botones y campos de Operaciones se ven y se comportan igual (incluido el
// foco visible para teclado).

/** Contorno de foco visible y consistente para controles interactivos. */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const buttonBase = `inline-flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${focusRing}`;

/** Acción principal de la pantalla o del panel (una por contexto). */
export const btnPrimary = `${buttonBase} bg-primary px-4 py-2.5 text-white shadow-sm hover:bg-primary-hover disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none`;

/** Acción secundaria junto a la principal (Reintentar, Escanear QR, Abrir…). */
export const btnSecondary = `${buttonBase} border border-slate-300 bg-white px-4 py-2.5 text-primary hover:bg-slate-50 disabled:opacity-50`;

/** Acción secundaria compacta, para filas de tablas y barras de filtros. */
export const btnSecondarySm = `${buttonBase} border border-slate-300 bg-white px-3 py-1.5 text-primary hover:bg-slate-50 disabled:opacity-50`;

/** Acción destructiva o irreversible (p. ej. cancelar una solicitud). */
export const btnDanger = `${buttonBase} bg-rose-700 px-4 py-2.5 text-white hover:bg-rose-800 disabled:opacity-50`;

/** Campo de texto, número, selector o área de texto. */
export const field =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-2 focus:-outline-offset-1 focus:outline-primary';

/** Se suma a `field` cuando el campo tiene un error de validación. */
export const fieldInvalid = 'border-rose-400 bg-rose-50/40';
