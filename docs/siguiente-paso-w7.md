# Siguiente paso — Brayan & Martina (post fase W)

**Rama integrada:** `feat/web-w3-close-w4-deliveries` (`681be95`)  
Incluye: W1–W6 (Martina W1/W2/W5 + Brayan W3/W4/W6).

---

## Estado de la fase W (web ops)

| ID | Tema | Dueño | Estado |
|----|------|-------|--------|
| W1 | Incidencias → API | Martina | Hecho |
| W2 | Planta + retenciones | Martina | Hecho |
| W3 | Handoffs sede | Brayan | Hecho |
| W4 | Entregas | Brayan | Hecho |
| W5 | Despacho/detalle sin local | Martina | Hecho (revisado OK) |
| W6 | Settings + canjes | Brayan | Hecho |
| **W7** | **Smoke E2E web juntos** | **Ambos** | **Siguiente** |

Verificación local tras merge: `tsc` OK · **19/19** UI ops relevantes · unit OK.  
W5: sin fallback local al asignar/pagar; sin botones de chofer en detalle; cola de despacho desde servidor; tests `detail-server-only` + `dispatch-server`.

---

## W7 — Smoke juntos (Definition of Done)

Un pedido de prueba en ambiente real (API + web), **sin localStorage como verdad**:

1. Cliente/API crea solicitud pagada (o staff confirma pago en detalle).
2. Web Despacho: asigna chofer INBOUND → servidor.
3. Chofer (o simulación de estados vía handoffs): llegada a planta.
4. Web Recepción: verify `DRIVER_TO_FACILITY`.
5. Web Planta: pesaje/proceso (según tipo) → listo.
6. Asignar OUTBOUND (Entregas o Despacho) → verify salida → entrega.
7. Incidencia de prueba: retener y resolver → pedido liberado.

**Quién hace qué en W7**

| Persona | Rol en el ensayo |
|---------|------------------|
| **Martina** | Guía planta + incidencias + checklist de pantallas ops |
| **Brayan** | Guía despacho/entregas/handoffs + anotar bugs |
| **Ambos** | 1 hora sync; documentar fallos; no abrir móvil hasta W7 verde |

---

## Después de W7 (fase B — backend mínimo)

| ID | Tarea | Dueño sugerido |
|----|-------|----------------|
| B1 | `POST /orders/:id/failed-pickup` (+ e2e) | Martina (Track A / back) |
| B2 | Gate PAYMENT antes salida sede (OK negocio) | Martina + OK Brayan |
| B3 | Staff reprograma franja + reassign chofer | Martina |
| B4 | UI web que consuma B3 | Brayan |

Fuera aún: push chofer, CARD/PSP, inspección prenda en servidor, IntakeHold entidad, reportes server.

---

## Cómo alinear ramas

Martina: su `feat/web-kyc-review` **no tiene W6** todavía. Para W7:

```text
git fetch origin
git checkout feat/web-kyc-review
git merge origin/feat/web-w3-close-w4-deliveries
```

o trabajar directo sobre `feat/web-w3-close-w4-deliveries`.

Brayan: rama ya pusheada con el merge de W5.
