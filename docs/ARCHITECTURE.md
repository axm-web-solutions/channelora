# Arquitectura

## Principios
- PostgreSQL es la fuente de verdad interna.
- Las reservas externas se importan de forma idempotente por `(connection_id, external_uid)`.
- Reservas directas se crean mediante una función SQL transaccional.
- Realtime actualiza la interfaz; no reemplaza sincronización externa.
- Cada proveedor implementa un adaptador independiente.

## Flujo de importación
1. Usuario crea conexión de calendario y selecciona la propiedad/canal.
2. Edge Function `sync-ical` verifica la sesión y la propiedad.
3. Descarga ICS con timeout y límite de tamaño.
4. Convierte eventos a reservas `tentative` inicialmente porque iCal no siempre comunica el estado real.
5. Guarda resultado y errores en `sync_runs`.
6. Realtime notifica a la interfaz.

## Próximas mejoras antes de producción
- Encriptar `source_url` y nunca mostrarla al frontend.
- Prevenir SSRF con lista permitida de dominios y bloqueo de IPs privadas/resolución DNS validada.
- Resolver eventos recurrentes y zonas horarias con pruebas específicas.
- Manejar `RECURRENCE-ID`, `STATUS:CANCELLED`, `METHOD:CANCEL`, eventos con DTEND ausente y cambios de UID.
- Mejorar conciliación de eventos desaparecidos; no auto-cancelar en base a una única lectura fallida.
- Unificar bloqueos y reservas importadas en un mecanismo de disponibilidad que detecte conflictos sin descartar datos fuente.
- Incorporar locks por conexión para evitar dos sincronizaciones concurrentes.
- Configurar monitorización, límites de frecuencia, backups y política de retención.
