# Propuesta de organización de módulos

La Web reparte un mismo pedido entre Solicitudes, Despacho, Recepción y retiros, Planta y Entregas. Esto obliga a cambiar de pantalla para continuar tareas relacionadas. La propuesta es organizar el trabajo por responsabilidad y mantener un único detalle de pedido accesible desde todas las vistas.

Que dos secciones se enlacen no significa que sean redundantes. Conviene unirlas cuando resuelven la misma tarea o repiten decisiones; conservar vistas especializadas cuando atienden trabajos distintos, como planificar transporte y procesar prendas.

**Estado actual:** ya están implementados la lista de Planta con modal de proceso e historial, la configuración de membresías y los formularios centrales. Las agrupaciones siguientes siguen siendo propuestas: todavía no existen Transporte como módulo unificado, un detalle universal del pedido ni suscripciones de clientes vinculadas a los planes.

## 1. Unir Despacho, Entregas y Mapa operativo en Transporte

Actualmente se programa una entrega en una sección, se asigna el chofer en otra y se consulta su posición en una tercera. Todas forman parte del mismo trabajo de coordinación del transporte.

**Propuesta:** un módulo **Transporte** con vistas de **Pendientes**, **Rutas** y **Seguimiento**. Pendientes reúne recogidas y entregas, con filtros para separarlas. Desde el pedido seleccionado se ajusta la agenda y se asigna al chofer sin cambiar de sección. Seguimiento muestra los mismos trabajos sobre el mapa y en lista.

**Rutas queda como función pendiente:** deberá permitir agrupar pedidos, ordenar paradas y comprobar capacidad y franjas. Reunir las pantallas actuales no implica que esa planificación ya exista.

La gestión administrativa de choferes, vehículos, sedes y zonas permanece en otra sección; Transporte consume esos recursos para organizar el trabajo del día.

## 2. Integrar la custodia en el contexto donde ocurre

Recepción y retiros agrupa varias transferencias que pertenecen a momentos diferentes: recepción del chofer en planta, salida hacia reparto y retiro del cliente. Obligar a abrir una consola general para cada una añade pasos y puede perder el pedido seleccionado.

**Propuesta:** ofrecer la misma acción de validación de código desde el pedido o la tarea correspondiente:

- **Planta:** recibir prendas del chofer y comprobar cantidades.
- **Transporte:** confirmar salida de prendas hacia el chofer.
- **Mostrador:** atender el retiro del cliente en sede.

Conservar una vista **Mostrador y custodia** para escanear códigos rápidamente y consultar transferencias e historial. Es útil para quien trabaja continuamente en recepción. Todos los accesos deben abrir la misma transferencia y aplicar los mismos requisitos.

## 3. Mantener Solicitudes como registro central, con un único detalle

Solicitudes debe servir para buscar cualquier pedido y conocer su situación completa. Planta y Transporte necesitan mostrar partes de ese mismo pedido, sin repetir toda su ficha ni ofrecer versiones distintas de una acción.

**Propuesta:** un detalle común con resumen y próxima acción siempre visibles, y secciones de **Prendas y precio**, **Agenda y transporte**, **Custodia**, **Incidencias** e **Historial**. Desde Planta o Transporte se abre directamente la sección pertinente, conservando filtros y selección al volver.

No hace falta trasladar todas las acciones a una pantalla gigante: cada equipo conserva su vista de trabajo y accede al mismo pedido cuando necesita más contexto.

## 4. Conservar Planta como espacio de trabajo especializado

Planta tiene una responsabilidad diferente a Transporte: recibir, pesar, inspeccionar, procesar y controlar calidad. Unir ambos módulos produciría una pantalla con demasiadas decisiones ajenas al trabajo de cada operador.

**Base implementada:** Planta ya muestra una lista con línea de proceso y un modal con resumen, gestión e historial.

**Propuesta pendiente:** agrupar los filtros y pendientes en **Ingreso e inspección**, **Pendientes de aprobación o pago**, **Procesamiento** y **Control de calidad y listos**. Destacar la próxima tarea dentro del modal actual y conectarlo con el futuro detalle común.

Separar visualmente los pedidos que esperan una acción de planta de los que esperan respuesta del cliente. Así la lista explica por qué un pedido no avanza.

## 5. Unificar el tratamiento de incidencias sin perder su contexto

Las incidencias se consultan globalmente, pero también aparecen en pedidos, recepción y planta. La cuarentena y las diferencias de conteo necesitan acciones específicas; no conviene convertir todo en una simple nota genérica.

**Propuesta:** una cola **Incidencias** con responsable, causa, siguiente acción y bloqueo generado. Desde el pedido se abre el mismo caso. Cada tipo presenta su resolución correspondiente: diferencia de prendas, problema de tratamiento, recogida fallida, daño o pérdida.

La cuarentena debe verse como una retención operativa vinculada al caso. Resolver el caso debe indicar si también se libera la retención, si falta otra autorización y a qué etapa vuelve el pedido.

## 6. Agrupar clientes, validaciones y canjes bajo Clientes

KYC revisa a una persona y los canjes utilizan su saldo e historial. El operador no debería buscar esos datos en varios módulos para atender al mismo cliente.

**Propuesta:** **Clientes** contiene el directorio y una bandeja de **Pendientes**, con filtros de validaciones y canjes. La ficha del cliente reúne pedidos, puntos, validaciones y canjes. Revisar un pendiente abre esa ficha en el contexto adecuado, respetando los permisos administrativos.

Cuando se implemente la suscripción, su asignación, vigencia y consumo se consultarán en la ficha del cliente; Comercial mantendrá la definición de los planes.

La creación de recompensas permanece en Comercial. La revisión y entrega de un canje se gestiona en Clientes. Son responsabilidades distintas sobre la misma información: configurar la oferta y atender su solicitud.

## 7. Agrupar la oferta comercial y ordenar la configuración

**Comercial** puede reunir **Servicios y tarifas**, **Promociones**, **Recompensas** y **Membresías** como secciones internas. Las cuatro secciones ya existen por separado; la propuesta es ordenar su navegación y referencias compartidas. Todas configuran qué se vende y bajo qué condiciones; comparten referencias a servicios, precios y elegibilidad.

**Sedes y zonas** ya están relacionadas en la pantalla actual y conviene mantenerlas juntas. Se pueden agrupar con **Flota** bajo **Recursos operativos**. Los horarios específicos de una sede se editan en su ficha; las reglas generales de cambio, cancelación, pago y capacidad se concentran en Configuración.

Cada parámetro debe tener un lugar principal de edición. Desde otros módulos puede mostrarse su valor y un acceso directo para cambiarlo, sin crear formularios independientes para la misma regla.

## Menú propuesto

| Área | Secciones |
| --- | --- |
| Inicio | Resumen y pendientes con acceso a la tarea correspondiente. |
| Operación | Solicitudes, Transporte, Planta, Mostrador y custodia, Incidencias. |
| Clientes | Directorio, pendientes de validación y canjes; ficha común. |
| Comercial | Servicios y tarifas, promociones, catálogo de recompensas y planes de membresía. |
| Recursos operativos | Flota, sedes y zonas. |
| Gestión | Reportes y configuración general. |

## Orden recomendado

1. **Crear una experiencia común del pedido:** evitar perder contexto al abrirlo desde otra sección.
2. **Reunir Transporte:** integrar agenda, asignación y seguimiento; planificar después la función pendiente de rutas.
3. **Compartir las acciones de custodia e incidencias:** una misma operación accesible desde distintos puntos.
4. **Agrupar Clientes y Comercial por responsabilidad:** atención de solicitudes frente a configuración de ofertas.
5. **Concentrar reglas y parámetros:** mantener un único lugar de edición por dato.

Esta es una propuesta de organización funcional. Los nombres y agrupaciones no cambian por sí solos las reglas del negocio; deben acompañarse de acciones consistentes y permisos adecuados para cada equipo.
