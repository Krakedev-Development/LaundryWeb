# MVP geoespacial Laundry

## Alcance

LaundryWeb y LaundryApp son demostraciones locales independientes. Se preparan escenarios equivalentes en Samborondón, Ecuador. No se comparten pedidos, asignaciones, sesiones ni posiciones entre aplicaciones o dispositivos. Login, pagos, KYC, chat y notificaciones siguen siendo demostraciones.

Los polígonos y las sedes son ilustrativos, no límites operativos aprobados. Los choferes de demo tienen zonas autorizadas explícitas para atender distintas direcciones de recogida y entrega desde la sede de recogida. La sede se determina por cobertura del pin de recogida.

## Configuración

Copiar .env.example a .env. Sin credenciales se puede completar la demostración con GEO_MODE=demo: búsqueda de direcciones preparadas, selección de coordenadas, asignación manual, estimaciones señaladas como simuladas y tracking local. Los mapas muestran un estado de configuración pendiente; no se dibujan líneas rectas como rutas por carretera.

Para consumir Mapbox, establecer VITE_MAPBOX_PUBLIC_TOKEN y VITE_GEO_MODE=mapbox, y reiniciar Vite. Usar un token público dedicado con permisos mínimos y restricciones de URL para los dominios Web autorizados. Nunca introducir tokens secretos.

La búsqueda utiliza Geocoding v6. Las consultas destinadas a guardar direcciones usan permanent=true. La cuenta debe permitir esa modalidad antes de activar MAPBOX_PERMANENT_GEOCODING. Con ella desactivada, se pueden ingresar direcciones manualmente y usar pines/direcciones preparadas. No se persisten resultados temporales.

Documentación oficial:

- https://docs.mapbox.com/api/search/geocoding/
- https://docs.mapbox.com/api/search/search-box/
- https://docs.mapbox.com/api/navigation/matrix/
- https://docs.mapbox.com/accounts/guides/tokens/
- https://www.mapbox.com/pricing

## Arquitectura

services/geo contiene los contratos equivalentes en ambos repositorios, configuración, proveedor de demostración, MapboxGeoProvider, proveedor API futuro, cobertura, rutas, scoring y tracking. Mapbox-specific responses permanecen en services/geo/mapbox. Los renderizadores Web y nativo son específicos de plataforma.

GeoProvider no decide asignaciones. DispatchService filtra estado, capacidad, sede, zonas autorizadas y antigüedad antes de Matrix. Clasifica usando ETA vial, zona, carga y desempeño; el operador confirma. Las asignaciones vuelven a validar reglas y estado en StorageService.

Matrix solicita N orígenes hacia un destino, particiona según límites del perfil y utiliza Directions para un único par. NoRoute y elementos null no se clasifican como accesibles. Las rutas se cachean cinco minutos con origen, destino, waypoints y perfil. No hay reintentos inmediatos ante 429; se respeta una pausa de cliente.

El mapa usa Mapbox GL JS con carga dinámica, marcadores accesibles, cobertura y lista textual equivalente. Solo dibuja geometría vial real. Las rutas y el movimiento se mantienen separados.

El tracking inicia al desplazarse a recogida, planta o entrega y se detiene al cambiar etapa. Un solo proveedor coordina posiciones dentro de la instancia Web; no las transmite a LaundryApp. La simulación actualiza ubicaciones activas y limpia temporizadores y suscripciones al desmontar. Offline mantiene dirección e información disponibles; no se promete descarga completa de mapas offline.

## Recorrido Web

1. Abrir /operations/dispatch y pulsar Abrir solicitud de demostración.
2. Asignar un chofer elegible para recogida.
3. Iniciar recogida y consultar el movimiento en el mapa operativo.
4. Marcar llegada, confirmar recogida, ir a planta y registrar recepción.
5. Procesar, pasar control de calidad y marcar lista para entrega.
6. Asignar entrega manualmente, iniciar entrega y marcar llegada.
7. Confirmar entrega y cerrar solicitud.

El pedido de demostración conserva su estado al recargar. Para repetir desde cero, usar el reset de demo existente en Configuración; esa acción reinicia todos los datos locales de Web.

## Datos existentes y mantenimiento

Los datos demo antiguos de Lima migran a Samborondón conservando IDs, estados, catálogo, pagos y balances. Se normalizan timestamps y estados de chofer. Las direcciones nuevas ya situadas en Ecuador no se trasladan automáticamente.

Los módulos puros geoespaciales se mantienen equivalentes entre los dos proyectos porque se autorizó conservar repositorios independientes. Después de editar escenarios Web, ejecutar desde LaundryApp: node scripts/sync-demo-seed.cjs. Esto actualiza el fixture inicial; nunca sincroniza datos en ejecución.

Backend Geo queda desactivado. LaundryGeoApiProvider reserva POST /geo/search, /reverse, /route y /matrix. Activar la bandera sin una API URL configurada produce un error visible. No se implementaron NestJS, PostGIS, Redis ni WebSockets productivos.

## Verificación

- npm run lint
- npm test
- npm run build
- npx playwright test

En Windows con Edge instalado y sin Chromium de Playwright, definir PLAYWRIGHT_CHANNEL=msedge antes de las pruebas UI.

Las pruebas unitarias no consumen Mapbox ni requieren internet. Cubren cobertura, bordes/huecos, elegibilidad, scoring, persistencia, Matrix, caché, rate limit, movimiento y ciclo completo Web. La prueba UI comprueba asignación manual, movimiento, cierre y mapa operativo.

La validación con una cuenta real de Mapbox y mapas en dispositivos sigue requiriendo credenciales y ejecución nativa.

VITE_TRACKING_MODE=mock activa el recorrido local. Otros modos reservan la integración futura y no publican posiciones simuladas. DriverLocationPublisher separa la escritura de posiciones del proveedor que genera el movimiento; RouteOptimizer reserva la ordenación futura de paradas.

Validación realizada: TypeScript estricto, nueve pruebas de dominio/geo, build de producción y recorrido UI completo en Edge con asignación manual, movimiento y cierre. Mapbox GL se carga en un bundle separado. Las pruebas no consumieron una cuenta real de Mapbox.
