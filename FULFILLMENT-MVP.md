# Demostración de ingreso/retiro y transferencias QR

Ambas aplicaciones mantienen datos locales independientes. Los escenarios equivalentes tienen los mismos pedidos, tipos de transferencia, identificadores y códigos iniciales; operar en Expo no cambia la Web. `npm run demo:prepare` regenera el catálogo y los metadatos de escenarios desde LaundryWeb.

## Ejecutar

- Expo: `npm install`, `npm run start:dev`; utilizar un development build Android/iOS con Mapbox y `expo-camera`. Hay que reconstruir el development build después de instalar la cámara. Expo Go no incluye el módulo nativo de Mapbox usado por esta aplicación.
- Vista web de Expo: `npm run web`. Mapbox continúa siendo nativo; se muestran direcciones y navegación externa en el navegador.
- LaundryWeb: `npm install`, `npm run dev`; módulo **Recepción y retiros** en `/operations/handoffs`.
- Credenciales de cliente preparado: `maria.torres@gmail.com` / `Laundry2026!`. Para crear pedidos nuevos: `nuevo@laundryfresh.com` / `Laundry2026!`. El chofer asignado se indica en el pedido; los choferes sin contraseña temporal usan `Laundry2026!`.

## Recorridos

Al solicitar un servicio, el cliente elige **recogida y entrega a domicilio** o **ingreso y retiro en sede**. No se ofrecen combinaciones híbridas.

En sede: prendas → extras → sede y cita de ingreso → pago simulado. No se solicitan direcciones domiciliarias ni una franja domiciliaria de entrega. El cliente presenta el código de ingreso; el operador verifica el código, registra la cantidad y confirma la recepción física. Después de procesamiento y control de calidad se habilita el código de retiro. Se registra el nombre y la relación/autorización de quien retira, incluido un tercero con el código.

A domicilio: asignación de recogida → navegación/llegada → código cliente a chofer → traslado/llegada a planta → código chofer a sede → procesamiento/control de calidad → asignación de entrega → código sede a chofer → navegación/llegada → código chofer a cliente. El chofer no puede iniciar la entrega hasta que la sede confirme la salida. La confirmación final completa el pedido y concede puntos una sola vez.

Expo conserva los roles Cliente y Chofer. **Operaciones de sede · demo** representa explícitamente al personal de sede y utiliza el mismo `HandoffService`; no crea un login de Supervisor. La planta y el despacho locales continúan simulándose. En Web el operador confirma un chofer elegible entre las recomendaciones. Para representar al chofer en recepción, se habilita el control explícito de demo correspondiente.

## Escenarios preparados

- `SOL-STORE-001`, sede `FAC-02`, cliente `CUST-001`: ingreso `583214`; retiro `583351`.
- `SOL-HOME-001`, misma sede/cliente: recogida `726483`; ingreso en planta `726620`; salida con chofer `726757`; entrega `726894`.

Los códigos de etapas futuras permanecen pendientes. El domicilio preparado usa los identificadores de asignación `SOL-HOME-001-pickup` y `SOL-HOME-001-delivery`. Los pedidos nuevos y las regeneraciones reciben identificadores y tokens aleatorios locales.

**Reiniciar escenarios locales**, en operaciones de sede de Expo, restaura datos y saldos y cierra sesión después de confirmar la advertencia. Web conserva su reinicio de demo en ajustes. Un reinicio elimina únicamente los datos locales de esa aplicación.

## Reglas implementadas

- El estado persistido del pedido representa el negocio: esperando ingreso, en planta, procesando, control de calidad, listo, completado o incidencia. El viaje se deriva de los hitos de las dos etapas de fulfillment; no hay un segundo estado de pedido persistido.
- QR con token opaco, código alternativo de seis dígitos, generación y uso único. No contienen datos personales. Los códigos no caducan por días: se consumen al confirmar la transferencia física. Las fechas de vencimiento explícitas siguen validándose para futuras integraciones.
- Verificar registra auditoría y entrega una constancia local; no cambia custodia. Confirmar vuelve a validar operador, sede, asignación, etapa, pago y generación dentro de una transacción.
- Cinco códigos incorrectos con un pedido seleccionado bloquean esa transferencia. Un código global desconocido no bloquea pedidos arbitrarios. La cámara se pausa después de detectar un QR para no multiplicar intentos por fotogramas.
- Regenerar requiere administrador, sede y motivo; conserva el registro revocado y crea otra generación. Nunca se regenera ni reutiliza un registro usado.
- El override administrativo requiere motivo y una segunda confirmación física. Respeta pago, sede, etapa, asignación y uso único, y queda identificado en la auditoría. No habilita códigos pendientes o revocados.
- Una diferencia de prendas registra la recepción física y bloquea el procesamiento y la salida. Resolver exige operador de la sede y motivo; conserva cantidades originales, recepción y resolución. No modifica silenciosamente la tarifa.
- El pago nuevo requiere conexión y conserva el comportamiento de demo existente. La verificación y confirmación pueden realizarse con los datos locales guardados y siempre se identifican como validación local.
- La atención fuera de la cita produce una advertencia de demo; no impide la entrega física.
- La tarifa en sede es provisional: catálogo por tipo de prenda, extras y descuentos existentes, sin transporte domiciliario. Se configura en `businessConfig.storePricing`; queda pendiente validar precios y horarios reales con el encargado.

## Persistencia, migración y límites

Expo guarda pedidos, etapas, códigos, auditoría, recibos, incidencias y puntos en el mismo snapshot de AsyncStorage. Web usa el documento local `lw_workflow_v2` para confirmar pedidos, choferes, incidencias, códigos, auditoría y puntos de forma atómica. Ambos preservan el historial de los pedidos anteriores. Las transferencias físicas acreditadas por estados antiguos se identifican como **importación de custodia anterior**, sin inventar una verificación QR.

`LocalHandoffRepository` y `HandoffService` separan almacenamiento y reglas. `HandoffApi` declara la futura integración sin implementar un backend ni sincronización entre dispositivos. La validación local no acredita identidad ni custodia ante un servidor.

Mapbox, cobertura y movimiento simulado se mantienen para el domicilio. La búsqueda de sedes filtra disponibilidad y atención al cliente antes de consultar Matrix y ordenar por tiempo de viaje; no exige que el cliente esté dentro de cobertura domiciliaria. Los mapas reales requieren el token configurado.

La cámara de Web requiere HTTPS o localhost, según [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia); siempre se ofrece entrada manual. La cámara nativa utiliza [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/). La comprobación física de cámara, permisos y escaneo cruzado en Android/iOS requiere dispositivos y development builds; las exportaciones JavaScript no sustituyen una compilación APK/IPA.

## Comprobar

- Expo: `npm run typecheck`, `npm test`, `npx expo export --platform all --output-dir dist-geo`.
- UI Expo: servir `dist-geo` con `node scripts/serve-ui.cjs dist-geo 8084`; establecer `EXPO_UI_STATIC=true`, `PLAYWRIGHT_CHANNEL=msedge` y ejecutar `npm run test:ui`.
- Web: `npm run lint`, `npm test`, `npm run build`, `npm run test:ui` con el navegador Playwright disponible.

Las pruebas cubren ambos recorridos, roles/sedes, pago y etapas, bloqueo/regeneración, uso único e idempotencia, incidencias, override, migración, persistencia, recepción local sin conexión y regresiones geográficas. Login, pagos, KYC, chat y notificaciones siguen siendo demostraciones locales.
