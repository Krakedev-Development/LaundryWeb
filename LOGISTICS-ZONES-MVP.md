# Zonas y sedes del MVP

## Registro

1. Entrar como Administrador a **Logística → Sedes** y elegir **Crear zona**.
2. Escribir el nombre y marcar al menos tres vértices en el mapa. Cerrar el polígono con el primer vértice o con **Cerrar polígono**. Los vértices se pueden arrastrar; **Deshacer punto** y **Redibujar** corrigen el trazado.
3. Guardar la zona. Seleccionarla y elegir **Agregar sede**.
4. Buscar una dirección o pulsar dentro del polígono para ubicar el pin. Se abre el formulario con la zona y las coordenadas seleccionadas.
5. Completar dirección, ciudad, identificación, capacidad, responsable, teléfono y horarios. Guardar la sede.
6. Repetir **Agregar sede** para registrar otras sedes en la misma zona.

Cancelar el selector o el formulario no registra una sede ni conserva un pin provisional. El pin también se puede ajustar dentro del formulario. La dirección se completa manualmente cuando se coloca el pin directamente, sin inventar una dirección a partir de las coordenadas.

## Mapa operativo

**Logística → Mapa operativo** muestra los polígonos y las capas de sedes, choferes, recogidas, entregas e incidencias. El filtro de zona incluye todas sus sedes. Los choferes tienen una leyenda de estados y las posiciones desactualizadas se atenúan.

Seleccionar un chofer permite seguir su ubicación. Pausar, reanudar y reiniciar están disponibles para recorridos simulados que ya están en curso. Estos controles no avanzan solicitudes, no cambian el estado operativo del chofer y no confirman transferencias de custodia.

## Compatibilidad y límites

- Las modalidades siguen siendo domicilio completo y pick up. No se habilita entrega de ropa por el cliente en el local.
- Una zona contiene varias sedes físicas mediante `Facility.zoneId`. Se conservan los identificadores y las asignaciones existentes.
- Para conservar la regla de cobertura actual, `Zone.facilityId` mantiene la sede de referencia. La primera sede de una zona nueva establece esa referencia; agregar más sedes no reasigna pedidos ni elige automáticamente la más cercana. Las zonas superpuestas conservan la prioridad existente: primera zona activa que contiene el punto.
- Las zonas sin sede todavía no ofrecen cobertura para crear solicitudes. Las sedes nuevas sí aparecen en los flujos existentes de selección de sede y creación de choferes.
- No se permite cambiar límites/estado de una zona con solicitudes en curso, excluir sus sedes del polígono ni desactivar una zona con sedes operativas. Se conserva la ubicación de una sede mientras tenga solicitudes en curso.
- Administrador configura zonas y sedes; Supervisor conserva consulta y alcance operativo existentes.
- Los datos se guardan en este navegador (`lw_zones_v1` y `lw_facilities`). Guardar una sede y su referencia de cobertura revierte ambas escrituras si falla la persistencia. Restablecer datos demo también restablece las zonas.
- No hay backend, WebSocket productivo ni sincronización con LaundryApp u otros dispositivos. El movimiento es una simulación local.
- Mapbox utiliza la configuración pública existente de `.env.example`. Si el mapa de calles no está disponible, se muestra una vista de coordenadas identificada como tal, con polígonos, pines y edición; no representa calles ni rutas reales.

## Validación

`pnpm run lint`, `pnpm test`, `pnpm run build` y `pnpm exec playwright test tests/zones.spec.cjs`.

Las pruebas cubren polígonos inválidos, permisos, varias sedes por zona, protección de operaciones existentes, reversión de escrituras, pausa/reanudación/reinicio y el registro desde el navegador con cancelación, recarga y filtros.
