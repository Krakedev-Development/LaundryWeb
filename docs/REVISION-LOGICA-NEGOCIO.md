# Revisión de la lógica de negocio de LaundryWeb

El recorrido general tiene sentido para una lavandería: solicitar el servicio, recoger prendas, recibirlas en planta, inspeccionar, procesar y devolver. Esta revisión evalúa ese modelo operativo y sus decisiones pendientes. El prototipo actual utiliza datos simulados.

## 1. Precio, aprobación y pago

En los servicios por peso, el importe definitivo se conoce después de recoger y pesar las prendas. El cliente necesita una estimación inicial y saber qué puede cambiar. Si se cobra antes de la recogida, debe quedar claro si es un anticipo o una autorización.

**Definir:** cuándo se cobra, qué variación de precio requiere aprobación y cuánto tiempo se espera la respuesta del cliente. El recorrido recomendado es estimación → recogida → pesaje e inspección → precio final → aprobación cuando corresponda → procesamiento.

## 2. Rechazo del presupuesto

Cuando el cliente rechaza un ajuste, la lavandería ya puede tener sus prendas y haber incurrido en costos. El rechazo necesita una salida operativa, no solo un estado pendiente.

**Definir:** si se revisa el presupuesto, se procesa una parte o se devuelven las prendas sin tratar; quién paga la devolución y cómo se autoriza. También debe existir una respuesta para el cliente que no contesta.

## 3. Modalidades de atención

Las modalidades actuales son recogida y entrega a domicilio, o recogida a domicilio y retiro en sede. Ambas son coherentes, pero el nombre «Pick up» puede resultar ambiguo.

**Definir:** mostrar nombres que expliquen ambos extremos del servicio y decidir si se aceptará que el cliente lleve inicialmente sus prendas al local. Excluir ese ingreso tiene sentido si la operación se centra en recogidas; conviene reconsiderarlo si habrá locales de atención al público.

## 4. Selección de sede y capacidad

La cobertura geográfica por sí sola no garantiza que una sede pueda atender un pedido. También importan el tipo de tratamiento, la carga de planta y el plazo solicitado.

**Definir:** cómo se elige la sede considerando cobertura, servicio, capacidad y fecha prometida. Si una sede recibe y otra procesa, debe existir un traslado interno con responsables y registro de custodia.

## 5. Despacho y rutas

Asignar un chofer por pedido permite empezar, pero puede generar recorridos costosos al crecer. El número de pedidos tampoco representa por sí solo la capacidad del vehículo.

**Definir:** cómo agrupar recogidas y entregas por zona y franja, considerando volumen, tiempo y capacidad de transporte. La disponibilidad de recogida debe estar coordinada con la capacidad de procesamiento y devolución.

## 6. Control de prendas y custodia

Un pedido puede incluir prendas con tratamientos y tiempos distintos. Gestionarlo únicamente como una unidad dificulta atender diferencias, daños o retrasos parciales. Los códigos de transferencia ayudan, siempre que registren quién entrega, quién recibe y qué se transfiere.

**Definir:** cuándo se controla por pedido, bolsa, lote o prenda; cómo se registra el estado previo y si se permiten entregas parciales. Incluir procedimientos para receptor autorizado, falta de conexión, código no disponible y diferencias de cantidad.

## 7. Plazos, incidencias y compensaciones

La fecha prometida debe considerar transporte, inspección, tratamiento y control de calidad. Las excepciones necesitan consecuencias concretas: resolver una incidencia debe incluir qué ocurre con las prendas, el plazo y el dinero.

**Definir:** recorridos específicos para cliente ausente, entrega fallida, mancha persistente, daño y pérdida. Cada caso necesita responsable, siguiente acción y criterio de cierre; cuando corresponda, reprogramación, nuevo tratamiento, devolución o compensación.

## 8. Identidad y fidelización

Solicitar documento y selfie a todos los clientes puede añadir fricción si no responde a una necesidad concreta. Las recompensas también necesitan reglas económicas claras para no comprometer el margen.

**Definir:** en qué casos se requiere verificar identidad y con qué finalidad. Para los puntos, establecer cómo se obtienen, cuándo vencen y qué sucede ante cancelaciones, reembolsos y canjes.

## 9. Membresías y rentabilidad

Ya se pueden configurar planes y existen dos ejemplos editables. Esto prepara la oferta comercial; todavía no contrata una suscripción ni aplica sus beneficios a los pedidos. Las etiquetas de membresía de Clientes no están conectadas a estos planes.

**Definir antes de venderlos:** servicios cubiertos, inicio y renovación del período, vencimiento o acumulación del saldo, precio de excedentes y combinación de descuentos. Acordar impagos, pausas, cancelaciones y qué ocurre con suscriptores existentes al cambiar un plan. El precio debe cubrir tratamiento y recogidas incluidas sin comprometer el margen.

## Prioridad recomendada

Antes de ampliar funciones, resolver estas cinco decisiones:

1. **Precio y pago:** qué se estima, qué se confirma y cuándo se cobra.
2. **Rechazo o falta de respuesta:** cómo se acuerda una salida y se devuelven las prendas cuando proceda.
3. **Custodia:** quién responde por las prendas y cómo se atienden diferencias o daños.
4. **Capacidad y plazos:** cómo se promete una fecha que transporte y planta puedan cumplir.
5. **Rutas de despacho pendientes:** por el momento se asignan choferes a pedidos individuales, pero no se planifica una ruta conjunta de recogidas y entregas. Definir cómo agrupar las paradas por zona y franja, ordenar el recorrido y comprobar la capacidad del vehículo y los horarios antes de despachar.

Estas decisiones deben guiar después las pantallas, los estados y los permisos de la Web.
