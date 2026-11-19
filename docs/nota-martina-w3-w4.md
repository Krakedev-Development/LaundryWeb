# Nota para Martina — W3 cerrado + W4 Entregas (Brayan)

**Rama:** `feat/web-w3-close-w4-deliveries`  
**Base:** tu `feat/web-kyc-review` (`cc4d31f` — W1 Incidencias)  
**Autor:** Brayan  
**Fecha:** 2026-11-19

Hola Martina — esto es lo que quedó hecho en mi rama para que puedas seguir con **W2** sin pisarnos.

---

## Estado del plan (ownership actual)

| ID | Qué | Quién | Estado |
|----|-----|-------|--------|
| **W1** | Incidencias → `/incidents` | Martina | Hecho (tu commit) |
| **W3** | Recepción / handoffs sede | Brayan (cierre) | **Cerrado** en esta rama |
| **W4** | Entregas sin mutaciones locales | Brayan | **Hecho** en esta rama |
| **W2** | Planta + retenciones locales (`QuarantineModal` / Plant) | **Martina — siguiente** | Pendiente |
| **W5** | Quitar assign offline en Despacho | Martina | Pendiente (puede ir con/después de W2) |
| **W6** | Settings policy/slots | Ya avanzado en tu rama | Revisar si falta algo fino |
| **W7** | Smoke juntos: 1 pedido recepción→planta→listo | Ambos | Después de W2 |

---

## Qué hice yo (resumen para ti)

### W3 — cierre (no reescribí tu trabajo)
En tu rama el flujo de handoffs **ya estaba bien** (colas + verify en detalle vía API). Yo solo:

- Confirmé que el mostrador no verifica en local.
- Añadí `revokeHandoff` en `handoffsApi.ts` (por si la UI lo necesita después).
- Test nuevo: fallo de servidor + botón **Reintentar** en `tests/handoffs-entry.spec.cjs`.

### W4 — Entregas contra servidor
- Nuevo cliente: `src/services/api/deliveriesApi.ts`
- Reescritura de `src/features/deliveries/DeliveriesPage.tsx`:
  - Lista y KPIs desde el servidor (estados de last-mile a domicilio).
  - **Eliminados** los botones locales **Despachar** y **Entregada** (divergían del backend).
  - Asignar chofer → `POST /orders/:id/assign` con `leg: OUTBOUND`.
  - Salida a ruta → redirige a Recepción / detalle (custodia `FACILITY_TO_DRIVER`).
  - Confirmación de entrega → la hace el chofer en su app; la web no la finge.
  - La franja de entrega se **muestra** del servidor; **solo el cliente** puede programarla (`PUT /outbound` es rol CLIENT). Si no hay franja, el panel lo explica.
- Tests: `tests/deliveries-api.test.cjs`, `tests/deliveries-server.spec.cjs` (3 casos UI).

### Pruebas que pasaron aquí
- `tsc --noEmit` limpio
- Unit: `deliveries-api.test.cjs`
- UI: `deliveries-server.spec.cjs` + `handoffs-entry.spec.cjs` → **8/8**

---

## Cómo trabajar encima (importante)

1. **No merges directos sobre mi rama si estás mid-W2.** Mejor:
   - Termina W2 en una rama tuya desde `feat/web-kyc-review` **o**
   - Trae mi rama:  
     `git fetch origin`  
     `git checkout -b feat/web-w2-plant origin/feat/web-w3-close-w4-deliveries`  
     así partes con W1+W3+W4 ya integrados.
2. Archivos que **yo toqué** (evitar editar en paralelo sin avisar):
   - `src/features/deliveries/DeliveriesPage.tsx`
   - `src/services/api/deliveriesApi.ts`
   - `src/services/api/handoffsApi.ts` (solo `revokeHandoff`)
3. Archivos que son **tuyos en W2** (yo no los toqué en este PR):
   - `QuarantineModal.tsx`
   - `PlantOrderModal.tsx` / `PlantProcessPanel.tsx` / retenciones locales
   - Lista “Incidencias vinculadas” en planta / `OrderHistory` si aún lee local

---

## Tu siguiente parte (W2) — checklist sugerida

Como dejaste en tu nota de W1:

1. **Retenciones locales → `/incidents`**
   - `QuarantineModal` (“Retener para revisión técnica”)
   - Retención del modal de Planta  
   Deben crear/retener con el mismo cliente `incidentsApi` (holdOrder) y **no** `moveToQuarantine` de `storageService`.
2. **Planta**
   - Leer pedidos del servidor.
   - Pesaje / ajustes / transitions vía API (`plantApi` ya existe en la rama base).
   - Quitar quarantine local; al retener, el pedido queda en `INCIDENT` en servidor.
3. **Incidencias vinculadas en `PlantOrderModal`** y lo que quede de historial local de incidencias → misma fuente `useServerIncidents` / API.
4. **Reportes** siguen fuera de la fase W (como acordamos).

Cuando W2 esté verde, avisamos y hacemos **W7** juntos (1 pedido de punta a punta en web sin localStorage).

---

## DoD relevante ya cubierto

- [x] Handoffs sede vía API (W3)
- [x] Entregas sin Despachar/Entregada locales (W4)
- [x] Incidencia chofer en web + resolve libera pedido (W1 — tuyo)
- [ ] Planta / quarantine solo servidor (W2 — **tú**)
- [ ] Assign offline eliminado en Despacho (W5)
- [ ] Settings policy/slots OK (W6 — revisar)
- [ ] Smoke W7

Cualquier duda sobre entregas o handoffs, ping a Brayan. Éxitos con W2.
