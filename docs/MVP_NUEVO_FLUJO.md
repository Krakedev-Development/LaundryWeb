# Nuevos flujos del MVP

La implementación amplía la base actual de LaundryApp y LaundryWeb. No restaura los commits revertidos de la app. Conserva referencias anteriores, usuarios, historial, saldo y puntos; agrega una versión de negocio a las nuevas solicitudes.

## Una solicitud, entrada y salida independientes

| Modalidad  | Entrada             | Salida                     | Transferencias físicas |
| ---------- | ------------------- | -------------------------- | ---------------------- |
| HOME_HOME  | Recogida con chofer | Entrega con chofer         | 4                      |
| HOME_STORE | Recogida con chofer | Retiro del cliente en sede | 3                      |

El pedido conserva su ID durante todo el ciclo. Sus tramos tienen método, dirección, sede, agenda, asignación y avances propios. Planta maneja pesaje, inspección, aprobación, lavado, control de calidad y disponibilidad. El traslado del chofer no representa otro pedido ni reemplaza su estado de negocio.

Cada transferencia tiene QR y código manual único de seis dígitos, de un solo uso. Verificar abre la confirmación; no cambia la custodia. Confirmar registra cantidades o receptor, operador y momento. Se vuelven a validar asignación, pago aplicable, sede, etapa y generación del código. Las diferencias de prendas registran el ingreso físico y bloquean el avance hasta su resolución. Regenerar, revocar o verificar una excepción administrativa requiere permisos y motivo, y deja auditoría.

## Precio, agenda y excepciones

- Precio fijo: cotización de prendas, extras, descuentos, logística e IVA configurado antes de confirmar; pago simulado por tarjeta o débito de la billetera local.
- Precio por peso: ingreso permitido sin pago previo; importe pendiente, sin presentar un total de cero como precio final. Planta registra peso real en LB o KG, inspecciona y comunica el importe.
- Ajustes: importe, motivo interno y mensaje separado para el cliente. El cliente acepta o rechaza sobre el mismo pedido. El procesamiento y la salida requieren pago y resolución de ajustes.
- Cupones: validación de vigencia, mínimo y disponibilidad. El cálculo previo no consume cupos ni usos. En servicios por peso se revisan las condiciones al pesar; un cupón no aplicable se informa sin perder la medición física.
- Agenda: franjas por sede y contexto, dentro de sus días y horarios, con capacidad y reservas. Consultar no reserva. Confirmar reserva en una operación; reprogramar libera y reserva sin guardar cambios parciales si falla.
- Cambios: antes de iniciar el tramo o consumir su código; vuelven a comprobar cobertura, modalidad, tiempos y cupos. Se revocan códigos obsoletos y se libera la asignación anterior.
- Ausencia: el chofer informa el fallo; operaciones lo resuelve con motivo y mensaje, conserva las paradas omitidas y habilita una nueva agenda. La custodia ya recibida no puede reiniciarse mediante esta acción.
- Cancelación: libera agenda y asignaciones, revoca códigos sin usar y conserva historial. Los cargos solo se aplican cuando están configurados. El administrador puede exonerarlos con motivo.

El límite de carga del chofer es opcional. Mapbox Matrix calcula tiempos por calles cuando hay un token válido; Laundry calcula el ranking por cercanía, zona, carga y desempeño. El operador confirma la asignación. Sin token se muestran estimaciones de demostración identificadas. La ruta tiene paradas de recogida, ingreso a planta, salida de planta y entrega. El reordenamiento solo afecta paradas pendientes y respeta dependencias y ventanas.

## Permisos y datos

**Administrador y Supervisor acceden exclusivamente a LaundryWeb. LaundryApp admite únicamente Cliente y Chofer.** El administrador configura catálogo, promociones, horarios y políticas, revisa KYC, crea choferes y gestiona excepciones críticas. El supervisor opera su sede y recibe vistas sin documentos, biometría ni notas sensibles. El cliente accede a sus pedidos, precios, mensajes, pagos, cargos, notificaciones y puntos. El chofer accede a sus asignaciones y su ruta; no tiene registro público. Los canjes nuevos de la app reservan puntos mientras están pendientes. Su revisión corresponde al Administrador en la web. Como ambas demostraciones son independientes, la solicitud de la app permanece local; en la web el control «Simular solicitud · MVP» prepara otra solicitud local para mostrar aprobación, rechazo y entrega. La aprobación registra un único débito y el rechazo libera la reserva; ambos requieren motivo y dejan auditoría. Los movimientos anteriores se conservan. El chat con chofer exige una asignación vigente y no expone su teléfono personal.

Los fixtures usan iconos para personas y verificaciones. Las fotografías reales cargadas por el usuario durante el registro pueden revisarse en la misma instalación. Una promoción puede usar una imagen propia opcional. Se mantienen los logos oficiales, sin emojis ni imágenes genéricas.

LaundryWeb guarda su repositorio local en el navegador. LaundryApp guarda su repositorio en AsyncStorage, su sesión nativa en SecureStore y el borrador de solicitud localmente. La app conserva los pedidos originales ORD-001, ORD-002 y ORD-003, saldo y puntos del cliente existente. También conserva su mínimo anterior de $5 como configuración local de demostración, editable; no establece un mínimo contractual para ambas plataformas.

**App y web son demostraciones independientes.** Un pedido creado en Expo Go no aparecerá en LaundryWeb ni en otro teléfono. La app muestra acciones de cliente y chofer mediante ejemplos preparados en distintas etapas. El ciclo de operaciones se demuestra en la web con sus perfiles Administrador y Supervisor; sus controles MVP pueden representar acciones del cliente o chofer sin crear perfiles administrativos móviles. No se implementó un backend, pasarela real, SMS, push remoto ni sincronización entre dispositivos.

## Decisiones en revisión

El panel muestra estas decisiones pendientes; un campo vacío no impone un valor comercial:

- IVA y tratamiento tributario; tarifas logísticas definitivas.
- Cargos y corte para cambios, cancelaciones, ausencia o recogida fallida.
- Consecuencia de ajustes rechazados y reglas de reembolso.
- Condiciones contractuales de pago.
- Traslados entre sedes, cupos definitivos, obligatoriedad de reservar retiro y autonomía del chofer para reordenar.

Los valores que el administrador configure son reglas de la instalación de demostración. Los ajustes rechazados permanecen bloqueados en revisión. Las cancelaciones pagadas no devuelven dinero automáticamente. El flujo actual conserva una sede de servicio.

## Cómo demostrarlo

Desde LaundryApp:

```powershell
npx.cmd expo start --clear
```

Se puede usar `npx expo start` sin un script especial de LAN. `--clear` limpia Metro cuando hace falta; `--lan` es opcional. El teléfono y Metro deben poder comunicarse, y Expo Go debe admitir el SDK instalado en el proyecto. Los mapas usan react-native-maps y WebView disponibles en Expo Go; no se agregó un requisito de development build.

Los botones del login cargan estas cuentas; contraseña de demostración `123456`:

| Cuenta                         | Correo               |
| ------------------------------ | -------------------- |
| Cliente de los nuevos fixtures | cliente@demo.laundry |
| Chofer de los nuevos fixtures  | chofer@demo.laundry  |
| Cliente original               | cliente@test.com     |
| Chofer original                | chofer@test.com      |

La creación y configuración de choferes se realiza exclusivamente en LaundryWeb por el Administrador y afecta a su flota local. No crea automáticamente una cuenta en la app independiente.

Fixtures comunes: SOL-HH-001, SOL-HS-001, SOL-SH-001, SOL-SS-001 y SOL-WEIGHT-001. En la app hay además ejemplos preparados que conservan su avance al recargar:

- APP-DEMO-PICKUP: el chofer demo inicia ruta, marca llegada, verifica y confirma la recogida; el cliente presenta su código.
- APP-DEMO-DELIVERY: salida de planta ya preparada; el chofer demuestra ruta y entrega final, y el cliente presenta su código.
- APP-DEMO-ADJUSTMENT: peso e inspección ya preparados; el cliente acepta o rechaza el ajuste y realiza el pago demo.

Estos ejemplos agregan datos nuevos y no reemplazan pedidos, saldos ni historial guardado. Si la configuración o disponibilidad existente impide preparar un ejemplo, se conserva el repositorio previo. Recepción, pesaje, inspección, procesamiento, asignación, KYC, configuración y revisión de canjes se realizan en LaundryWeb.

LaundryWeb: `npm.cmd run dev`. Su login conserva Carlos Mendoza (Administrador, `admin@laundryweb.com`) y Elena Rostova (Supervisor, `supervisor@laundryweb.com`). Las solicitudes, recepción, despacho y planta trabajan sobre el mismo repositorio del navegador. Los controles rotulados MVP permiten al administrador representar la respuesta del cliente sin cambiar a una cuenta móvil; registran el actor cliente en auditoría.

## Validación y mantenimiento

```powershell
# LaundryWeb
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:ui

# LaundryApp
npm.cmd run typecheck
npx.cmd expo export --platform android --platform ios --platform web --output-dir dist-mvp-check
```

Para probar la exportación web de Expo con Playwright: exportar primero la app y ejecutar `npm.cmd run test:app` en LaundryWeb. La configuración inicia la vista previa local en 8083.

Los dominios de LaundryWeb y LaundryApp son independientes. `npm.cmd run domain:check` verifica que ambos permiten las mismas dos modalidades. `domain:sync` se conserva como alias de esa comprobación y ya no sobrescribe modelos ni archivos de Expo.

La validación automatizada cubre los dos ciclos vigentes, QR, permisos, pago, pesaje, ajustes, reservas, reprogramación, cancelación, rutas, persistencia y fallos de almacenamiento. La exportación Android/iOS no sustituye la prueba física de escaneo, permisos y mapas en un teléfono con Expo Go.

## Resultado de validación — 7 de octubre de 2026

- 46 pruebas de lógica, permisos, códigos, geografía y persistencia: aprobadas.
- 20 pruebas de interfaz de LaundryWeb: aprobadas, incluida la revisión administrativa de canjes y el acceso operativo del Supervisor.
- 4 recorridos de LaundryApp en su exportación web: aprobados; login exclusivo de Cliente/Chofer, cierre de sesiones administrativas antiguas, ajuste y pago, recogida con mapa y checkout con reserva única.
- TypeScript en ambos proyectos, build de LaundryWeb y exportaciones Android, iOS y web de Expo: completados.
- App y web mantienen demostraciones independientes. Las copias del dominio comparten contratos y reglas, sin sincronización de datos.

Queda pendiente la comprobación física de cámara, permisos, escaneo y mapas en Expo Go. Las pruebas de exportación e interfaz no sustituyen esa comprobación en un teléfono.

## Recogida obligatoria a domicilio

Domicilio completo incluye recogida y entrega por chofer; pick up incluye recogida por chofer y retiro del cliente en sede. Crear, cotizar o cambiar un pedido a ingreso del cliente en sede está bloqueado, incluso si una sede conserva una capacidad antigua. Los cupos de ingreso del cliente quedan inactivos y sus códigos sin usar se revocan. Pedidos guardados aún pendientes requieren confirmar dirección y horario de recogida antes de asignar chofer. Las constancias de recepciones ya efectuadas se conservan como historial, sin generar evidencia de recogida inexistente. Recepción y retiros muestra retiro del cliente, transferencias del chofer e historial.
