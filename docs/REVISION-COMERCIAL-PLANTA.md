# Membresías y nueva vista de Planta

Rama local creada desde `main`: `feat/commercial-memberships-plant`. Incluye las guías, diagramas y propuestas de negocio y organización elaboradas anteriormente.

## Comercial → Membresías

Nueva sección administrativa para crear y editar planes, buscar por nombre y filtrar activos e inactivos. Cada plan define nombre, descripción, precio, periodicidad mensual/trimestral/anual, peso y unidad incluidos, recogidas, descuento, prioridad y otros beneficios. Los cupos corresponden al período del plan.

La configuración se guarda en el navegador y se conserva al recargar. Se validan nombres duplicados, importes, cupos y descuentos. Restablecer la demo elimina los planes personalizados y vuelve a cargar los dos ejemplos iniciales.

| Plan de ejemplo | Cuota mensual | Peso incluido | Recogidas | Descuento adicional |
| --- | --- | --- | --- | --- |
| Esencial | $29,90 | 10 kg | 2 | 5 % |
| Familiar | $59,90 | 25 kg | 4 | 10 % |

El plan Familiar incluye atención prioritaria. Estos importes y beneficios son ficticios y editables. Los ejemplos se incorporan a instalaciones existentes sin reemplazar planes personalizados ni sobrescribir cambios guardados.

Las etiquetas de membresía de Clientes pertenecen al modelo anterior y no se enlazan automáticamente con estos planes.

El alcance de esta sección es configurar la oferta comercial. La contratación por clientes, los cobros recurrentes, la aplicación automática de descuentos y el consumo de cupos requieren su propio flujo de suscripción; no se simulan como si ya estuvieran implementados.

## Operaciones → Planta de lavado

La cuadrícula se sustituye por una lista adaptada a escritorio y móvil de pedidos con cliente, servicio, prendas, línea de proceso y SLA. Permite buscar y filtrar por sede, etapa y riesgo; incluye pedidos recibidos que siguen en planta y excluye los que ya salieron.

Al seleccionar un pedido se abre un modal central con tres secciones:

- **Resumen y prendas:** datos del pedido, importes, peso, prendas e incidencias.
- **Gestionar proceso:** controles del flujo existente y retención/liberación para revisión.
- **Historial y bitácora:** cronología de eventos, auditoría, pesajes, ajustes, pagos demo, cambios, mensajes, constancias de custodia e incidencias, según los registros disponibles.

El modal también permite abrir la ficha general del pedido. La línea muestra etapas, no una estimación de tiempo transcurrido. El pesaje se identifica como no aplicable en servicios de precio fijo.

Se corrige la persistencia del motivo de retención y la liberación a control de calidad para pedidos del flujo moderno. Ambas acciones conservan historial y auditoría en la misma escritura local.

## Formularios centrales

Crear o editar un ítem de catálogo, crear una promoción, crear una recompensa y registrar o editar un chofer utilizan un modal central con contenido desplazable. Las fichas de Clientes (incluido el ajuste de puntos) e Incidencias también se abren en el centro. Comparten cierre con Escape, foco contenido, restauración del foco al cerrar y bloqueo del desplazamiento de la página de fondo. Sedes y zonas mantienen sus diálogos centrales existentes.

## Recorrido de revisión

1. Abrir Comercial → Membresías, crear un plan y recargar. Editar su precio o marcarlo inactivo.
2. Entrar a Planta, probar búsqueda y filtros y abrir un pedido. Consultar su proceso y la pestaña Historial y bitácora.
3. Abrir los formularios de catálogo, promociones y recompensas en escritorio y móvil. Comprobar el cierre con Escape y el acceso a todos sus campos.
4. Abrir el alta y la edición de Choferes, la ficha de un cliente y una incidencia. Comprobar su apertura central y los formularios internos.

La rama queda local para revisión; no se publica en GitHub en esta entrega.

## Comprobaciones

Se añaden pruebas para creación y edición persistente de planes, validación de términos, permisos, reset de membresías y retención/liberación de pedidos. La revisión de navegador cubre formularios centrados, Escape, restauración del foco, lista de Planta e historial en escritorio y móvil.

La ejecución general anterior detectó dos bloqueos en pruebas sin modificar: `app-persistence.test.cjs` importa un archivo de LaundryApp ausente en este entorno y `qr-roundtrip.test.cjs` requiere `qrcode-generator`, que no está instalado. En esa ejecución pasaron las otras 50 comprobaciones. La revisión posterior completó 4 pruebas específicas de membresías/retención y 8 pruebas de navegador. Estos resultados corresponden a la implementación; esta actualización documental no vuelve a ejecutar las pruebas.
