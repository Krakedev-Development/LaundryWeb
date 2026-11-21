# Plan de acción — Brayan (Dev 2) · Refactor Operaciones

Fuente: `AUDITORIA-OPERACIONES-WEB.md` + mensaje de Martina.  
Base: `main` de LaundryWeb (y demas repos en `main`).

## Roles

| Persona | Rol en la auditoría | No edita |
|---------|---------------------|----------|
| **Brayan** | **Dev 2** | `OperationTab`, `OrderDetailPage`, Despacho, Entregas, Recepción y retiros |
| **Martina** | **Dev 1** | `PlantProcessPanel`, `IncidentModal`, `plantApi` |

Contratos de navegación (ambos): `?pedido=` (Despacho/Entregas/Planta), `?custodia=&traspaso=` (detalle).

---

## Qué haces tú YA (orden estricto)

### 1) P0 — en paralelo entre sí (sin depender de Martina)

#### T-01 — Quitar ajuste local en Pedido
- **Objetivo:** nada de éxito sin servidor; ajustes solo en Planta.
- **Hacer:**
  - Quitar "+ Proponer ajuste" y eliminar `PaymentAdjustmentModal.tsx`.
  - En `OrderInfoTab`: listar ajustes con `plantApi.listAdjustments` (solo lectura).
  - Si falla la carga: error + **Reintentar** (sin datos locales).
- **Archivos:** `OrderInfoTab.tsx`, borrar `PaymentAdjustmentModal.tsx`.
- **Aceptación:** `grep` sin `proposeAdjustment` / modal; Pedido no escribe ajustes en localStorage.

#### T-03 — Quitar formularios falsos en Actividad
- **Objetivo:** no simular "nota interna" ni "mensaje al cliente".
- **Hacer:**
  - Retirar formularios de nota/mensaje en `ActivityTab`.
  - Conservar línea de tiempo e incidencias.
- **Archivos:** `ActivityTab.tsx`.
- **Aceptación:** ningún toast de éxito sin llamada al servidor.

**Rama sugerida (juntos P0):** `fix/ops-no-local-success`  
(Martina hará T-02 en la misma ola, en *sus* archivos: `LogisticsTab` / `ScheduleChangeModal`.)

---

### 2) En cuanto puedas (desbloquea a Martina)

#### T-08d — `IncidentModal` prop `allowHold?: boolean` (default `true`)
- **Por qué urgente:** Martina lo necesita en **T-07** (detalle en etapas de planta pasa `allowHold={false}`).
- **Hacer:**
  - Añadir `allowHold?: boolean` (default `true`) en `IncidentModal`.
  - Si `allowHold === false`: ocultar / deshabilitar la casilla "Retener la solicitud" (y no enviar `holdOrder: true`).
- **Archivo:** solo `IncidentModal.tsx` (tú sí lo editas; ella no).
- **Compatible hacia atrás:** sin la prop, se comporta como hoy.

Puedes meter T-08d en el mismo PR de P0 o en un PR chico inmediato después.

---

## Después (tu carril Dev 2, cuando Martina avance)

| Orden | Tarea | Notas |
|------|-------|--------|
| Paso 2 | **T-08** (a, b, e) + **T-09a** | Planta: `?pedido=&seccion=`, `refreshKey`, `PlantProgress`; quitar pago de `PlantProcessPanel` + borrar `plantApi.confirmPayment` |
| Paso 3 | (libre / tests T-08) | Martina hace T-05, T-07, T-09b |
| Paso 4 | **T-08c** | Quitar `onlyInPlant` **después** del merge de su T-07 |
| Paso 5 | **T-10** (parte Planta) | Menos recargas N+1 |
| Paso 6 | **T-13** | Limpieza `AppContext` / `storage` (al final) |

No toques: Despacho, Entregas, Handoffs, `OperationTab`, `OrderDetailPage` (eso es Martina / Dev 1).

---

## Checklist de arranque hoy

1. [x] Repos en `main` actualizado.
2. [ ] Crear rama desde `main` (ej. `fix/ops-no-local-success`).
3. [ ] Implementar **T-01** + **T-03**.
4. [ ] Implementar **T-08d** (`allowHold`) y avisar a Martina.
5. [ ] Specs Playwright + `pnpm lint`.
6. [ ] PR; ella revisa (y al revés).

---

## Criterio P0 (para el PR)

- Pedido no propone ajustes locales; lista ajustes del servidor o error+Reintentar.
- Actividad sin formularios que fingen éxito.
- `IncidentModal` acepta `allowHold={false}`.
- Cero toasts de éxito sin respuesta HTTP OK en esos flujos.
