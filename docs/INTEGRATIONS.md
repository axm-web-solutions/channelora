# Integraciones con plataformas

## iCal / ICS
Una integración iCal puede importar eventos y, en canales compatibles, publicar un calendario de disponibilidad. Los detalles de huésped, pagos, estado de confirmación y cancelación pueden no estar disponibles.

Para cada propiedad:
1. Abre la configuración de calendario del anuncio en la plataforma.
2. Copia el enlace de exportación iCal (la plataforma lo puede llamar exportar calendario).
3. En Channelora crea una `calendar_connections` de dirección `import`.
4. Guarda la URL en un entorno seguro.
5. Ejecuta `sync-ical` y verifica `sync_runs`.
6. Si quieres publicar el calendario Channelora en el canal, crea una conexión `export`, genera un token aleatorio largo, guarda su SHA-256 en `export_token_hash`, marca la conexión como `active` y usa la URL de `publish-ical` con el token original. No guardes el token original.

## Airbnb
Airbnb dispone de importación/exportación de calendarios para anuncios compatibles. La integración directa por API depende de acceso autorizado. No se incluye autenticación oficial ni acceso de partner en este ZIP.

## Booking.com
La API de conectividad está sujeta a requisitos y autorización de proveedor. Verifica las opciones actuales en la extranet y con el proveedor de conectividad que utilices. No se garantiza que una cuenta nueva pueda obtener acceso directo.

## Tripadvisor
La disponibilidad de sincronización depende del producto de alojamiento y las integraciones ofrecidas para el anuncio/cuenta. Verifica antes de prometer sincronización.

## Vrbo / Expedia
Vrbo ofrece importación/exportación iCal en flujos compatibles. Las opciones varían por producto/cuenta. La integración API requiere acceso autorizado o proveedor compatible.

## Reglas
- No hacer scraping ni automatizar el login de las plataformas.
- No mostrar una conexión como bidireccional si solo importa.
- Mostrar siempre última sincronización y errores.
- Un canal externo puede tardar en reflejar una fecha bloqueada; no venderlo como garantía instantánea.
