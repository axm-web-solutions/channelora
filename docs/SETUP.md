# Instalación y despliegue

## 1. Crear Supabase
1. Crea un proyecto en Supabase.
2. En SQL Editor ejecuta `supabase/migrations/0001_initial_schema.sql`.
3. En Authentication configura proveedores y confirmación de email según tu necesidad.
4. Copia Project URL y anon/publishable key a `.env.local`.

## 2. Frontend
```bash
cp .env.example .env.local
pnpm install
pnpm dev
```
En Windows PowerShell:
```powershell
Copy-Item .env.example .env.local
pnpm install
pnpm dev
```

## 3. Supabase CLI
Instala Supabase CLI y autentícate:
```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy sync-ical
supabase functions deploy publish-ical
```
Comprueba los nombres de secretos requeridos en tu versión CLI. Supabase suele exponer `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` a las funciones desplegadas; nunca pongas service role key en variables `VITE_*`.

## 4. Probar una conexión iCal
Crea propiedad desde la app, después inserta una conexión con la URL iCal de un anuncio. En esta base la URL puede insertarse desde el SQL Editor como administrador; hazlo solo en un proyecto privado de prueba. Luego llama a `sync-ical` con el JWT del usuario y JSON:
```json
{ "connection_id": "UUID_DE_LA_CONEXION" }
```
No pegues enlaces privados de calendario en tickets, logs o repositorios.

## 5. Publicar calendario
La función `publish-ical` usa un token aleatorio largo, pero necesita que el hash SHA-256 del token se guarde en `calendar_connections.export_token_hash` y que la conexión tenga `direction='export'`, `status='active'`. Genera y guarda el token original en un gestor de secretos, no en la base. La URL pública será:
`https://TU_PROJECT_REF.supabase.co/functions/v1/publish-ical?token=TOKEN_LARGO`

## 6. Programar sincronización
Para un piloto, invoca `sync-ical` manualmente y verifica los resultados. Para producción, configura Supabase Cron para invocar una función de orquestación que recupere las conexiones vencidas y ejecute las sincronizaciones con límite de concurrencia. No programes llamadas sin autenticación ni expongas URLs secretas.

## 7. Antes de producción
- Agregar UI de administración de conexiones, no solo SQL.
- Añadir pruebas automatizadas de solapamientos y concurrencia.
- Validar límites de Edge Functions y parsing de calendarios reales.
- Añadir bloqueo por conexión, observabilidad y backups.
- Realizar revisión de seguridad y privacidad.
