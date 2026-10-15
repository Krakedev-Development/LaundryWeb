# Clean Code: aplicación gradual

Se aplican las reglas de `LAUNDRY_CLEAN_CODE_RULES.md` a los módulos intervenidos, preservando comportamiento y presentación.

## Restricciones vigentes

- Únicamente `HOME_HOME` y `HOME_STORE`: recogida a domicilio en ambas modalidades.
- Mantener rutas, permisos, contratos, persistencia, validaciones y diseño actuales.
- Archivos nuevos de hasta 100 líneas; hasta 150 sólo con una responsabilidad que lo justifique.
- Dirección de dependencias: pages → widgets → features → entities → shared.
- Reutilizar servicios y componentes; UI genérica sin conocimiento del negocio.
- Evitar dependencias nuevas y abstracciones para capacidades que no existen.

## Primera etapa

- `pages/orders/OrdersListPage.tsx`: composición del listado de solicitudes.
- `widgets/order-list`: controles, tabla y celdas con el contenido y estilos vigentes.
- `features/orders/model`: estado de filtros, selección para asignación y lectura de la siguiente acción.
- `entities/order/model`: búsqueda, filtros, contadores y ordenación sin React ni almacenamiento.
- `shared/ui/FilterSelect.tsx`: selector genérico por valores y callbacks.

Restablecer conserva el comportamiento actual respecto a la modalidad. Las opciones y rutas permanecen vigentes.

## Validación de esta etapa

- TypeScript, build de producción y 44 pruebas de negocio existentes.
- Equivalencia frente al selector anterior en 4.536 combinaciones de filtros, con los mismos contadores y ordenación.
- Pruebas UI de las dos modalidades, precio por peso, asignación y operaciones.
- Comparación visual del listado, filtros y búsqueda sin resultados en móvil y escritorio.

## Continuación

Los módulos heredados de detalle, operaciones, contexto, servicios y tipos siguen pendientes de separación por responsabilidad. Esta etapa no declara completada la refactorización de todo el proyecto.
