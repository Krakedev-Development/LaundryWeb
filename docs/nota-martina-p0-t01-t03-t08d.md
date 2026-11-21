# Nota para Martina — P0 Dev 2 listo (`fix/ops-no-local-success`)

**Rama:** `fix/ops-no-local-success` (desde `main`)  
**Autor:** Brayan (Dev 2)  
**Qué cierra:** T-01, T-03 y T-08d (auditoría operaciones)

---

## Qué se hizo

### T-01 — Pedido sin ajuste local
- Eliminado `PaymentAdjustmentModal.tsx` y el botón **"+ Proponer ajuste"**.
- `OrderInfoTab` lista ajustes con `plantApi.listAdjustments` (solo lectura).
- Si el servidor falla: mensaje de error + **Reintentar** (sin `localStorage` / workflow).
- Texto aclaratorio: los ajustes se gestionan en Planta.

### T-03 — Actividad sin éxito falso
- Quitados de `ActivityTab` el centro de comunicaciones, nota interna y mensaje al cliente (no hay endpoint).
- Se mantienen: línea de vida operacional + incidencias (+ Registrar).

### T-08d — `allowHold` en `IncidentModal` (te desbloquea T-07)
- Nueva prop opcional: `allowHold?: boolean` (**default `true`**, compatible hacia atrás).
- Con `allowHold={false}`:
  - no se muestra la casilla "Retener la solicitud";
  - el POST nunca envía `holdOrder: true`.
- Sin tocar tus archivos (`OrderDetailPage` / `OperationTab`).

---

## Archivos tocados (solo carril Dev 2)

| Archivo | Cambio |
|---------|--------|
| `src/features/orders/components/OrderInfoTab.tsx` | Listado RO + error/reintentar |
| `src/features/orders/components/PaymentAdjustmentModal.tsx` | **Eliminado** |
| `src/features/orders/components/ActivityTab.tsx` | Sin formularios simulados |
| `src/features/orders/components/IncidentModal.tsx` | Prop `allowHold` |

**No se editaron:** `OperationTab`, `OrderDetailPage`, Despacho, Entregas, Recepción y retiros, `PlantProcessPanel`, `plantApi`.

---

## Qué puedes hacer tú ahora

### Ya (misma ola P0)
- **T-02** en tus archivos (`LogisticsTab` / `ScheduleChangeModal`): quitar éxito simulado sin servidor.  
  Puedes trabajar en la misma rama `fix/ops-no-local-success` o en la tuya y mergeamos.

### Desbloqueado para el siguiente paso
- **T-07:** en etapas de planta, monta el modal así:

```tsx
<IncidentModal
  order={order}
  isOpen={…}
  onClose={…}
  allowHold={false}   // ← ya disponible
  // …
/>
```

- Fuera de planta: no hace falta pasar la prop (sigue permitiendo retener).
- Enlace "Gestionar en Planta" / "Retener en Planta" con `?pedido=…&seccion=proceso` según la guía.

### Contratos de navegación (sin cambio)
- Despacho / Entregas / Planta: `?pedido=`
- Detalle: `?custodia=` y `?traspaso=`

---

## Cómo probar rápido

1. Checkout: `git fetch && git checkout fix/ops-no-local-success`
2. Pedido → sin "+ Proponer ajuste"; ajustes del servidor o error + Reintentar.
3. Actividad → timeline + incidencias; sin notas/mensajes falsos.
4. Incidencia sin `allowHold` → casilla de retener visible (como antes).
5. Con `allowHold={false}` → casilla oculta.

Cuando merges / revises, avísame y sigo con T-08 (a, b, e) + T-09a en Planta.
