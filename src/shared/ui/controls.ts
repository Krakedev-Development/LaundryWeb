// Estilos compartidos de botones y campos de formulario. Úsalos en lugar de copiar clases en cada
// pantalla: así todos los botones y campos de Operaciones se ven y se comportan igual (incluido el
// foco visible para teclado).

/** Contorno de foco visible y consistente para controles interactivos. */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const buttonBase = `inline-flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:active:scale-100 ${focusRing}`;

/** Acción principal de la pantalla o del panel (una por contexto). */
export const btnPrimary = `${buttonBase} bg-primary px-4 py-2.5 text-white shadow-[0_1px_2px_rgba(15,76,129,0.22),0_4px_12px_-2px_rgba(15,76,129,0.25)] hover:bg-primary-hover hover:shadow-[0_2px_6px_rgba(15,76,129,0.28)] disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none`;

/** Acción secundaria junto a la principal (Reintentar, Escanear QR, Abrir…). */
export const btnSecondary = `${buttonBase} border border-slate-200/90 bg-white px-4 py-2.5 text-ink shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-slate-300 hover:bg-slate-50/90 hover:text-primary disabled:opacity-50`;

/** Acción secundaria compacta, para filas de tablas y barras de filtros. */
export const btnSecondarySm = `${buttonBase} border border-slate-200/90 bg-white px-3 py-1.5 text-ink shadow-[0_1px_2px_rgba(15,23,42,0.02)] hover:border-slate-300 hover:bg-slate-50 hover:text-primary disabled:opacity-50`;

/** Acción destructiva o irreversible (p. ej. cancelar una solicitud). */
export const btnDanger = `${buttonBase} bg-rose-600 px-4 py-2.5 text-white shadow-[0_1px_2px_rgba(225,29,72,0.2)] hover:bg-rose-700 disabled:opacity-50`;

/** Campo de texto, número, selector o área de texto. */
export const field =
  'mt-1 w-full rounded-xl border border-slate-200/90 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 hover:border-slate-300 focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15';

/** Se suma a `field` cuando el campo tiene un error de validación. */
export const fieldInvalid = 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500/15';
