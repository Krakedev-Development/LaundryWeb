# Diagramas de flujos y relaciones de LaundryWeb

Estos diagramas describen la Web actual como demostración. Las flechas representan acciones o relaciones implementadas; no implican sincronización con LaundryApp, LaundryDriver ni un backend. Los controles rotulados «MVP» representan al cliente o al chofer desde la propia consola.

## 1. Cómo se relacionan los módulos

```mermaid
flowchart TD
    LOGIN[Acceso y perfil demo] --> HOME[Dashboard y navegación]
    HOME --> ORD[Solicitudes y detalle]
    CLI[Clientes] -->|Titular e historial| ORD
    KYC[Validaciones KYC] -->|Estado local de identidad| CLI
    CAT[Catálogo] -->|Servicios, tarifas y duración| ORD
    PRO[Promociones] -.->|Configuración disponible; aplicación incompleta en UI| ORD
    ORD --> DIS[Despacho]
    DIS --> QR[Recepción y retiros QR]
    QR --> PLA[Planta: peso, inspección y lavado]
    PLA -->|Domicilio completo| ENT[Entregas]
    PLA -->|Pick up| QR
    ENT -->|Confirmación final de custodia| QR
    QR --> FIN[Pedido completado o cerrado]
    ORD --> INC[Incidencias y retenciones]
    QR --> INC
    PLA --> INC
    INC -->|Resolver bloqueos aplicables| ORD
    LOG[Choferes, sedes y zonas] -->|Cobertura, capacidad y disponibilidad| DIS
    LOG --> MAP[Mapa operativo]
    DIS -->|Asignaciones y trayectos simulados| MAP
    ORD --> REP[Reportes]
    FIN -->|Historial y condiciones de canje| CLI
    CLI --> REW[Recompensas y canjes]
    REW -->|Reservas y movimientos de puntos| CLI
    CFG[Configuración y agenda] -->|Reglas y franjas| ORD
    CFG --> DIS
    CFG --> REP
```

La solicitud es el vínculo central: referencia al cliente, servicio, sede y choferes; sus transferencias, incidencias, ajustes, pagos y mensajes usan el identificador del pedido. KYC actualiza la ficha del cliente; no representa una validación externa. Las promociones existen como configuración, pero no hay un recorrido completo visible para consumir un cupón desde esta consola.

## 2. Acceso, perfiles y navegación común

```mermaid
flowchart TD
    A[Abrir Web] --> B{Ruta}
    B -->|Login| C[Elegir preset Administrador o Supervisor]
    C --> D[Enviar formulario de acceso]
    D --> E[Guardar perfil local; no validar credenciales]
    E --> F[Dashboard]
    B -->|Raíz o ruta desconocida| F
    B -->|Ruta existente| G[Página solicitada]
    F --> G
    G --> H{Perfil demo}
    H -->|Administrador| I[Operación, clientes, comercial, logística y gestión]
    H -->|Supervisor| J[Operación, clientes, logística y reportes]
    I --> K[Acciones y validaciones por pantalla]
    J --> K
    K --> L[Cerrar sesión desde menú]
    L --> C
    K --> M[Buscar con botón o Ctrl/Cmd + K]
    M --> N[Resultados locales: pedidos, clientes, choferes e incidencias]
    N --> G
    K --> O[Notificaciones derivadas de datos locales]
    O --> G
```

No hay un guard global de autenticación. El menú y varias acciones se adaptan al rol; las páginas administrativas incorporan restricciones propias. Cerrar sesión navega al login, pero conserva el perfil local. «Recordarme» y recuperación de contraseña no ejecutan un proceso de sesión real.

## 3. Recorrido completo del pedido

```mermaid
flowchart TD
    A[Pedido de semilla o abrir solicitud demo] --> B{¿Recogida pendiente de agenda?}
    B -->|Sí| C[Confirmar franja de recogida con cupo]
    B -->|No| D[Asignar chofer de recogida]
    C --> D
    D --> E[Iniciar recogida y marcar llegada]
    E --> F[QR: cliente entrega al chofer]
    F --> G[Traslado y llegada a planta]
    G --> H[QR: chofer entrega a planta]
    H --> I[Pesaje e inspección]
    I --> J[Ajustes, aprobación y pago demo cuando correspondan]
    J --> K[Procesamiento]
    K --> L[Control de calidad]
    L --> M[Pedido listo]
    M --> N{Modalidad de salida}
    N -->|Domicilio completo| O[Agenda y asignación de entrega]
    O --> P[QR: sede entrega al chofer]
    P --> Q[Trayecto y llegada al domicilio]
    Q --> R[QR: chofer entrega al cliente]
    N -->|Pick up| S[QR: sede entrega al cliente autorizado]
    R --> T[Entrega completada]
    S --> T
    T --> U{¿Persisten bloqueos?}
    U -->|Sí| V[Resolver incidencia o retención aplicable]
    V --> U
    U -->|No| W[Cierre disponible según versión del flujo]
```

Ambas modalidades empiezan con recogida a domicilio. No se ofrece ingreso inicial del cliente en el local. Los registros antiguos pueden conservar constancias de ingresos anteriores, sin habilitar nuevas entregas iniciales en sede.

## 4. Lista y detalle de solicitudes

```mermaid
flowchart TD
    A[Solicitudes] --> B[Buscar y filtrar por modalidad, pestaña, estado, prioridad, sede o chofer]
    B --> C[Seleccionar pedido]
    C --> D[Detalle: cliente, artículos, precio, agenda, mapa e historial]
    D --> E{Acción según etapa}
    E --> F[Asignar o avanzar trayecto]
    E --> G[Pesaje, inspección y precio]
    E --> H[Agenda, cambio o cancelación demo]
    E --> I[Registrar incidencia o cuarentena]
    E --> J[Abrir Recepción y retiros]
    E --> K[Override administrativo con motivo]
    F --> L[Validar reglas de negocio]
    G --> L
    H --> L
    I --> L
    J --> M[Validar custodia con código]
    K --> L
    L -->|Aceptada| N[Guardar y refrescar datos locales]
    L -->|Rechazada| O[Mostrar motivo; conservar estado]
    M --> N
    N --> D
```

La lista no contiene un formulario general de alta. «Abrir solicitud de demostración» en Despacho crea o reutiliza `SOL-DEMO-001`. Los botones del detalle dependen de la etapa y de la versión de negocio; algunos estados físicos solo avanzan mediante custodia QR.

## 5. Despacho y selección de chofer

```mermaid
flowchart TD
    A[Despacho] --> B{Tipo de trabajo}
    B -->|Recogidas| C[Pedidos pendientes con recogida agendada]
    B -->|Entregas| D[Pedidos listos o programados con salida a domicilio]
    C --> E[Seleccionar solicitud]
    D --> E
    E --> F[Filtrar candidatos por sede, estado, capacidad, zona y ubicación reciente]
    F --> G{¿Hay candidatos elegibles?}
    G -->|No| H[Revisar restricciones, flota o cobertura]
    G -->|Sí| I[Estimar distancia y ETA; ordenar candidatos]
    I --> J[Operador elige chofer y añade nota opcional]
    J --> K[Revalidar asignación]
    K -->|Válida| L[Actualizar tramo, carga, estado e historial]
    K -->|Inválida| H
    L --> M[Detalle para iniciar recorrido]
    M --> N[Mapa muestra movimiento simulado]
```

La sugerencia no asigna sola. En modo demo, los tiempos y posiciones no provienen del tráfico ni del teléfono de un conductor.

## 6. Validación QR y custodia

```mermaid
flowchart TD
    A[Seleccionar sede y transferencia] --> B[Introducir código o leer QR con cámara]
    B --> C{¿Código activo, vigente y no usado?}
    C -->|No| D[Rechazar; registrar intento o bloqueo]
    C -->|Sí| E{¿Coinciden actor, sede, asignación, pago y etapa?}
    E -->|No| D
    E -->|Sí| F[Revisar pedido y datos de transferencia]
    F --> G{Tipo de transferencia}
    G -->|Ingreso de prendas| H[Registrar conteo recibido]
    G -->|Retiro en sede| I[Identificar receptor y autorización]
    G -->|Otro traspaso| J[Confirmar revisión]
    H --> K{¿Coincide el conteo?}
    K -->|No| L[Registrar diferencia, incidencia y retención de ingreso]
    K -->|Sí| J
    I --> J
    J --> M[Confirmar transferencia local]
    M --> N[Consumir código; emitir recibo y auditoría]
    N --> O[Actualizar custodia, estado, historial y parada]
    L --> P[Operador autorizado resuelve con motivo]
    P --> O
    D --> Q[Administrador: regenerar, revocar u override habilitado con motivo]
    Q --> B
```

Los códigos son de un solo uso y cinco intentos inválidos pueden bloquearlos. La cámara actúa como lector local; el código no verifica físicamente la identidad o la entrega. El control para representar al chofer asignado permite ensayar ese actor desde la Web.

## 7. Pesaje, ajustes, aprobación y pago

```mermaid
flowchart TD
    A[Custodia recibida en planta] --> B{Modelo de tarifa}
    B -->|Por peso| C[Registrar peso y unidad]
    B -->|Fijo| D[Importe del servicio disponible]
    C --> E[Calcular importe local]
    D --> F[Inspeccionar prendas y registrar mensaje]
    E --> F
    F --> G{¿Requiere ajuste?}
    G -->|Sí| H[Proponer importe, motivo interno y mensaje al cliente]
    H --> I[Administrador simula decisión del cliente]
    I -->|Acepta| J[Aplicar ajuste al mismo pedido]
    I -->|Rechaza| K[Registrar rechazo y revisar pedido]
    G -->|No| L[Revisar saldo y bloqueos]
    J --> L
    K --> L
    L --> M{¿Pago requerido y monto conocido?}
    M -->|Sí| N[Administrador simula pago del cliente]
    M -->|No| O[Validar inicio de procesamiento]
    N --> O
    O -->|Reglas cumplidas| P[Procesamiento habilitado]
    O -->|Falta un requisito| Q[Mostrar bloqueo correspondiente]
```

El rechazo no se dibuja como aprobación automática: el servicio vuelve a evaluar las condiciones del pedido. Los registros de pago no generan cobros, facturas o reembolsos reales.

## 8. Agenda, cambios, cancelación y cargos

```mermaid
flowchart TD
    A[Detalle del pedido: controles MVP del cliente] --> B{Acción}
    B -->|Cambiar agenda o salida| C[Elegir tramo, método y franja con cupo]
    C --> D[Validar etapa, cobertura y reglas de cambio]
    D -->|Permitido| E[Liberar reserva anterior y reservar nueva franja]
    E --> F[Revocar códigos anteriores sin usar; actualizar agenda y asignación aplicable]
    B -->|Cancelar| G[Indicar motivo]
    G --> H[Validar etapa y política de cancelación]
    H -->|Permitido| I[Cancelar y liberar recursos aplicables]
    D -->|No permitido| J[Mostrar motivo]
    H -->|No permitido| J
    F --> K{¿La política genera cargo?}
    I --> K
    K -->|Sí| L[Registrar cargo local pendiente]
    K -->|No| M[Guardar historial del cambio]
    L --> N[Administrador puede exonerar con motivo]
    N --> M
```

Solo el tramo de salida permite alternar domicilio y retiro en sede. Los cambios de entrada mantienen recogida a domicilio. Las reglas y cargos dependen de la política local de demo; una cancelación no devuelve dinero mediante una pasarela.

## 9. Planta y cuarentena

```mermaid
flowchart TD
    A[Kanban de planta: filtrar sede y riesgo SLA] --> B[Abrir pedido]
    B --> C[Completar ingreso, pesaje, inspección y requisitos comerciales]
    C --> D[Iniciar procesamiento]
    D --> E{¿Problema de prendas?}
    E -->|No| F[Control de calidad]
    E -->|Sí| G[Cuarentena con motivo y notas]
    G --> H[Atender problema y liberar]
    H --> F
    F --> I{¿Calidad aprobada?}
    I -->|Sí| J[Marcar listo]
    I -->|Problema| G
    J --> K{Salida}
    K -->|Chofer| L[Agenda y despacho de entrega]
    K -->|Cliente| M[Retiro en sede con código]
```

El kanban contiene etapas de varias versiones del flujo. Para peso, ajustes, aprobación y pago del flujo comercial nuevo, el detalle reúne los controles pertinentes.

## 10. Entrega a domicilio y retiro en sede

```mermaid
flowchart TD
    A[Pedido listo] --> B{Método de salida}
    B -->|Domicilio| C[Programar fecha, franja, destinatario y teléfono]
    C --> D{¿Se asigna chofer al programar?}
    D -->|Sí| E[Entrega asignada]
    D -->|No| F[Entrega programada]
    F --> G[Asignar desde Despacho o detalle]
    G --> E
    E --> H[Confirmar QR de sede a chofer]
    H --> I[Iniciar entrega; simular trayecto y llegada]
    I --> J[Confirmar QR de chofer a cliente]
    B -->|Retiro en sede| K[Atender retiro; revisar receptor y código]
    K --> L[Confirmar QR de sede a cliente]
    J --> M[Entrega registrada]
    L --> M
    M --> N{¿Puede cerrarse según etapa e incidencias?}
    N -->|Sí| O[Completar o cerrar pedido]
    N -->|No| P[Resolver bloqueo y revisar]
    P --> N
```

La tabla Entregas incluye salida por chofer. Los retiros del cliente se gestionan en Recepción y retiros. El botón visible para confirmar una entrega no permite eludir los requisitos de custodia.

## 11. Incidencias, retenciones y recuperación

```mermaid
flowchart TD
    A[Detalle: registrar incidencia] --> D[Incidencia vinculada al pedido]
    B[QR: diferencia de conteo] --> C[Retención de ingreso]
    C --> D
    E[Regla de recogida fallida] --> D
    D --> F[Lista: buscar, filtrar y abrir caso]
    F --> G[Consultar evidencias de demo y agregar notas]
    G --> H[Resolver con explicación]
    H --> I[Guardar resolución y auditoría]
    I --> J{¿Hay además retención de ingreso?}
    J -->|Sí| K[Resolver retención en Recepción y retiros]
    J -->|No| L[Reevaluar bloqueos del pedido]
    K --> L
    L --> M[Retomar etapa o cerrar cuando corresponda]
```

La tabla permite consultar, anotar y resolver; el alta manual está en el detalle de una solicitud. Las evidencias que genera ese formulario son placeholders. Resolver el caso y liberar una retención son acciones relacionadas pero distintas.

## 12. Clientes, pedidos, KYC y puntos

```mermaid
flowchart TD
    A[Clientes: búsqueda y filtros] --> B[Ficha del cliente]
    B --> C[Perfil, direcciones y notas de consulta]
    B --> D[Historial de solicitudes]
    D --> E[Detalle del pedido]
    B --> F[Historial de puntos]
    F --> G{¿Administrador?}
    G -->|Sí| H[Ajustar puntos con cantidad y motivo]
    H --> I[Guardar saldo y ledger local]
    B --> J[Administrador abre cola KYC]
    J --> K[Revisar datos y placeholders de documentos]
    K --> L{Decisión}
    L -->|Aprobar| M[Completar checklist]
    M --> N[Guardar aprobado, revisor y fecha]
    L -->|Rechazar| O[Indicar motivo]
    O --> P[Guardar rechazado, revisor y fecha]
    N --> B
    P --> B
    I --> B
```

No hay alta o edición general de clientes en esta página. KYC no analiza imágenes ni valida identidad y no añade por sí solo una autenticación real.

## 13. Catálogo y promociones

```mermaid
flowchart TD
    A[Administrador: catálogo] --> B{Crear o editar servicio}
    B --> C[Nombre, categoría, tarifa, unidad, duración y restricciones]
    C --> D[Validar datos y guardar localmente]
    D --> E[Servicio activo o inactivo]
    E -->|Configuración de servicio y precio| F[Pedidos y reglas comerciales]
    G[Administrador: promociones] --> H[Crear cupón con código, descuento y condiciones]
    H --> I[Validar código único, vigencia y límites]
    I --> J[Guardar promoción local]
    J -.->|Aplicación y consumo no completados en la UI Web| F
```

El catálogo permite edición y estado activo/inactivo. Promociones ofrece creación; no hay un recorrido de edición o un botón completo para consumir cupones en pedidos desde la consola actual.

## 14. Recompensas y canjes

```mermaid
flowchart TD
    A[Administrador crea recompensa] --> B[Guardar costo en puntos y condiciones]
    B --> C[Elegir cliente y recompensa activa]
    D[Pedidos completados y saldo del cliente] --> E[Validar puntos disponibles, compras y gasto]
    C --> E
    E -->|Cumple| F[Simular solicitud del cliente]
    E -->|No cumple| G[Mostrar motivo]
    F --> H[Canje pendiente; reservar puntos]
    H --> I{Revisión administrativa con notas}
    I -->|Rechazar| J[Liberar reserva]
    I -->|Aprobar| K[Descontar puntos y registrar ledger]
    K --> L[Marcar recompensa entregada]
    J --> M[Actualizar ficha e historial del cliente]
    L --> M
```

La solicitud del cliente se representa desde la pestaña de canjes. La reserva evita considerar disponibles los mismos puntos para otro canje pendiente; la aprobación produce el débito local.

## 15. Zonas, sedes y flota

```mermaid
flowchart TD
    A[Administrador: Sedes] --> B[Crear o editar zona]
    B --> C[Dibujar polígono y validar geometría]
    C --> D[Guardar zona local]
    D --> E[Seleccionar zona y agregar sede]
    E --> F[Elegir pin dentro de cobertura]
    F --> G[Completar sede, capacidad, horarios y retiro en sede]
    G --> H[Validar y guardar sede y referencia de cobertura]
    H --> I[Administrador: registrar o editar chofer]
    I --> J[Asignar sede, zonas autorizadas, vehículo, capacidad y estado]
    J --> K[Disponibilidad y elegibilidad para Despacho]
    D --> K
    H --> K
    D --> L[Capas del mapa operativo]
    H --> L
    J --> L
```

El Supervisor consulta estos datos. Una zona puede contener varias sedes; la sede de referencia mantiene la regla de cobertura existente. Agregar sedes no reasigna automáticamente pedidos. Hay restricciones para cambiar cobertura, estado o ubicación cuando existen operaciones activas.

## 16. Mapa, capas y seguimiento simulado

```mermaid
flowchart TD
    A[Pedidos, choferes, sedes, zonas e incidencias locales] --> B[Mapa operativo y listado de ubicaciones]
    B --> C[Filtrar zona y activar capas]
    C --> D[Seleccionar marcador o fila]
    D --> E[Abrir registro relacionado]
    D --> F[Seleccionar o seguir chofer]
    G[Pedido en trayecto de recogida, planta o entrega] --> H[Generar recorrido simulado]
    H --> I[Publicar coordenadas localmente cada pocos segundos]
    I --> B
    F --> J[Pausar, reanudar o reiniciar simulación activa]
    J --> H
    G --> K[Cambio de etapa detiene o cambia el recorrido]
    K --> H
```

Las flechas de seguimiento solo actualizan posiciones. Las etapas del pedido y la custodia avanzan mediante sus acciones operativas. La configuración permite un proveedor geográfico externo opcional, pero el tracking predeterminado sigue siendo mock y el negocio continúa local.

## 17. Chat y avisos

```mermaid
flowchart TD
    A[Detalle: mensaje a operaciones o cliente] --> B[Validar y guardar mensaje del pedido]
    B --> C[Mostrar conversación local del pedido]
    D[Urgencias, incidencias y KYC pendiente] --> E[Generar lista de avisos en barra superior]
    E --> F[Elegir aviso]
    F --> G[Abrir módulo relacionado]
    H[Acción guardada o rechazada] --> I[Mostrar aviso temporal de resultado]
```

Estos mensajes, avisos y conversaciones no se entregan por email, push o SMS ni aparecen automáticamente en otra aplicación.

## 18. Dashboard, reportes y exportación

```mermaid
flowchart TD
    A[Datos de semilla y cambios locales] --> B[Dashboard y accesos operativos]
    B --> C[Abrir módulo o solicitud]
    A --> D[Reportes: indicadores y series]
    E[Valores fijos de presentación] --> B
    E --> D
    D --> F[Seleccionar pestaña, fecha o sede]
    F --> G[Panel comercial filtra por sede]
    F -.->|No afecta todos los indicadores ni series| D
    D --> H[Exportar CSV de pedidos]
    D --> I[Imprimir mediante el navegador]
```

La exportación utiliza todos los pedidos y no sigue todos los filtros visuales. Las series, pestañas y fechas no constituyen un informe temporal consistente. Pagos e ingresos son importes de demostración.

## 19. Configuración y reinicio

```mermaid
flowchart TD
    A[Administrador: Configuración] --> B[Editar parámetros globales]
    A --> C[Editar política comercial y franjas con cupos]
    B --> D[Guardar parámetros locales]
    C --> E[Validar y guardar política o franja]
    D --> F[Usar reglas en acciones posteriores aplicables]
    E --> F
    F --> G[Pedidos, agenda y despacho]
    A --> H[Restablecer datos demo]
    I[Botón de reset de la barra superior] --> H
    H --> J[Restaurar semillas, workflow y zonas]
    J --> K[Refrescar pantallas y perfil inicial]
```

El reset afecta la demo Web del navegador y se ejecuta sin confirmación previa. No sincroniza ni reinicia los otros repositorios.

## 20. De dónde salen los datos y qué se comparte

```mermaid
flowchart LR
    SEED[Semillas ficticias] --> STORE[StorageService y repositorios locales]
    UI[Acción en una pantalla] --> RULES[Reglas de negocio, custodia o zona]
    RULES -->|Aceptada| STORE
    RULES -->|Rechazada| MSG[Mensaje de error en la Web]
    STORE <--> LOCAL[localStorage del navegador]
    STORE --> CTX[AppContext y suscripciones]
    CTX --> VIEW[Pantallas, avisos, mapas y reportes]
    VIEW --> UI
    RESET[Reset de demo] --> SEED
    OTHER[LaundryApp, LaundryDriver y otros dispositivos]
    OTHER -. Sin sincronización de ejecución .-> ISOLATED[Demostraciones independientes]
```

Las escrituras no son solicitudes HTTP a un servidor. El workflow local enlaza pedidos con transferencias, recibos, ajustes, pagos, reservas, mensajes y auditoría; otras claves conservan catálogo, promociones, parámetros y zonas. Recargar conserva los cambios del mismo origen y perfil del navegador. Un perfil u origen distinto mantiene datos distintos.

## Referencias

- [Explicación completa de los flujos y límites actuales](FLUJOS-WEB-DEMO.md)
- [Modalidades y custodia](../FULFILLMENT-MVP.md)
- [Zonas y sedes](../LOGISTICS-ZONES-MVP.md)
- [Geografía y simulación](../GEO-MVP.md)

Los diagramas documentan las pantallas y servicios existentes. Las limitaciones de UI descritas en la guía —como el detalle de auditoría histórica de custodia no accesible desde las pestañas visibles— siguen aplicando.
