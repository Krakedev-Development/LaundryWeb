# Modalidades y transferencias vigentes

LaundryApp (Expo) y LaundryWeb mantienen datos locales independientes. Ambas permiten exclusivamente:

| Modalidad          | Entrada                    | Salida                      |
| ------------------ | -------------------------- | --------------------------- |
| Domicilio completo | Chofer recoge en domicilio | Chofer entrega en domicilio |
| Pick up            | Chofer recoge en domicilio | Cliente retira en sede      |

No se puede crear ni reprogramar un ingreso inicial del cliente en el local. La recepción del chofer en planta sigue siendo parte de ambos recorridos.

## Ejecutar y comprobar

- Expo: desde LaundryApp, npm install y npx expo start. Para navegador: npm run web. Los comandos y credenciales vigentes están en el README de LaundryApp.
- Web administrativa: desde LaundryWeb, npm install y npm run dev. Recepción y retiros se encuentra en /operations/handoffs.
- Lógica: npm test en cada proyecto. Tipos: npm run typecheck en LaundryApp y npm run lint en LaundryWeb.
- Interfaz: npm run export:web y npm run test:ui en LaundryApp; npm run test:ui y npm run build en LaundryWeb. En Windows se puede usar PLAYWRIGHT_CHANNEL=msedge.
- Compatibilidad de política: npm run domain:check en LaundryWeb. domain:sync es un alias de validación y no copia archivos sobre Expo.

## Recorrido

En ambos casos: confirmar dirección y franja de recogida, asignar chofer, llegada al domicilio, recoger las prendas, trasladarlas y confirmar recepción del chofer en planta. Después se mantienen pesaje, inspección, ajustes, pago, lavado y control de calidad.

Domicilio completo añade despacho al chofer, viaje y entrega al destinatario. Pick up habilita el código de retiro y registra a quien recibe en sede; no crea una ruta de entrega domiciliaria. En Web las transferencias utilizan códigos de un solo uso y comprobaciones de sede, asignación, pago y etapa. Expo conserva los controles de checklist y códigos opcionales de su prototipo.

## Datos anteriores

Los ingresos pendientes en local pasan a requerir una agenda de recogida a domicilio, con reserva anterior liberada y código obsoleto revocado. Se confirma una nueva franja con cupo antes de asignar al chofer. No se elige un horario automáticamente ni se registran prendas como recogidas. Los ingresos ya realizados conservan constancias, importes e historial y siguen desde su etapa actual.

Las semillas y los escenarios preparados utilizan las dos modalidades vigentes. Los códigos de cada etapa se consultan dentro del pedido. Pagos, KYC, chat, posición y operaciones demo continúan siendo locales; cámara, permisos y mapas nativos necesitan revisión en un dispositivo.
