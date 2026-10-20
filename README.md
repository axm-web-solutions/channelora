# Channelora — MVP de centralización de reservas

Base inicial de producto para 1–5 alojamientos, con React + TypeScript + Vite y Supabase (PostgreSQL, Auth, Realtime, Edge Functions).

## Estado honesto de las integraciones
Esta base implementa conexión por calendario iCal/ICS (importación y publicación) y deja adaptadores listos para crecer. **No incluye conexiones API oficiales ya autenticadas con Airbnb, Booking.com, Tripadvisor o Vrbo**: para eso hacen falta credenciales, permisos/certificaciones y/o acceso a un proveedor channel manager. No se debe automatizar login ni scraping de las plataformas.

## Incluye
- Dashboard web adaptable.
- Calendario simple de reservas/bloqueos.
- CRUD básico de propiedades y reservas directas.
- Supabase Auth y Realtime.
- Esquema SQL con RLS, funciones de disponibilidad y deduplicación externa.
- Edge Function para importar una URL ICS por conexión.
- Edge Function para publicar calendario ICS por token.
- Ejemplo de Cron / instrucciones de despliegue.
- Guía de arquitectura e integración por fases.

## Requisitos
- Node.js 20+
- pnpm 9+
- Cuenta/proyecto Supabase
- Supabase CLI para funciones y migraciones

## Arranque local
1. Copia `.env.example` a `.env.local` y rellena las variables.
2. Instala dependencias:
   ```bash
   pnpm install
   ```
3. Inicia frontend:
   ```bash
   pnpm dev
   ```
4. En Supabase SQL Editor ejecuta `supabase/migrations/0001_initial_schema.sql`.
5. Despliega Edge Functions siguiendo `docs/SETUP.md`.

El frontend espera que exista una sesión autenticada. Puedes activar el registro de usuarios en Supabase Auth y crear tu usuario desde la interfaz.

## Conectar un calendario
En Supabase, crea una fila en `calendar_connections` asociada a una propiedad. Guarda la URL de importación en `source_url` solo para un MVP privado y de prueba; para producción, cifra las URLs o guárdalas en secretos/almacén seguro. Invoca `sync-ical` con el ID de conexión desde un entorno autorizado.

## Limitaciones importantes
- iCal puede tener retrasos y normalmente no incluye todos los detalles de las reservas.
- Importar un calendario no implica sincronización bidireccional garantizada con el canal.
- El calendario ICS publicado por Channelora puede añadirse a canales que admitan importación iCal.
- No se garantiza ausencia absoluta de dobles reservas si un canal externo no refleja cambios a tiempo.
- Antes de usar con huéspedes reales, revisar seguridad, tratamiento de datos personales, backups y pruebas de concurrencia.

Consulta `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS.md` y `docs/SETUP.md`.

## Identidad de marca
El MVP usa **Channelora** como nombre provisional, con logotipo SVG y paleta premium verde profundo/menta. Consulta `docs/BRAND_IDENTITY.md` antes de modificar colores o mensajes. El nombre y el dominio no están legalmente despejados; completa las verificaciones indicadas antes de lanzamiento comercial.
