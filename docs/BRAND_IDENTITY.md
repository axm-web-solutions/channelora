# Channelora — guía de identidad de marca (propuesta provisional)

> **Estado:** identidad de trabajo para el MVP. El nombre, el dominio y el logotipo no han sido validados legalmente ni registrados. No invertir en campañas ni presentar solicitudes sin búsqueda de antecedentes.

## Posicionamiento
**Channelora** es una plataforma de centralización y sincronización de calendarios de reservas para operadores de alojamientos. La promesa inicial es una vista unificada de disponibilidad y conexiones; no se debe prometer sincronización instantánea ni integración oficial con una OTA si el conector no lo soporta.

## Eslogan
- **EN:** Every channel, in sync.
- **ES:** Todos tus canales, sincronizados.

## Personalidad
Tecnológica, minimalista, premium, clara y confiable. Hablar de conexión, visibilidad, control y coordinación. Evitar promesas absolutas como “cero dobles reservas garantizado”.

## Paleta oficial propuesta
| Token | Hex | Uso |
|---|---|---|
| Forest | `#102C2A` | Color principal, navegación, CTA y fondos oscuros |
| Mint | `#C9F2DF` | Contraste de marca, estados conectados y acentos |
| Paper | `#F5F7F6` | Fondo de aplicación |
| Gold | `#D6A967` | Acento secundario, advertencias no críticas y detalles premium |
| Ink | `#172B28` | Texto principal |
| Line | `#E3EBE7` | Bordes y separadores |

Usar verde profundo y menta como combinación principal. El oro debe ser escaso. Para errores críticos utilizar rojo semántico independiente de la marca. Verificar contraste WCAG antes de producción.

## Logotipo
- `apps/web/public/brand/channelora-logo.svg`: logotipo horizontal editable en SVG.
- `apps/web/public/brand/channelora-mark.svg`: símbolo cuadrado para favicon y aplicación.
- Símbolo: nodos conectados alrededor de un centro; representa canales sincronizados y una fuente central de disponibilidad.
- No deformar, no aplicar sombras fuertes y no recolorear sin actualizar la guía.

## Tipografía
Inter o Manrope para títulos; DM Sans o Inter para interfaz y cuerpo. Preferir pesos 400, 500, 600 y 700.

## Voz y mensajes
- EN: “Connect your booking calendars. See availability in one place.”
- ES: “Conecta tus calendarios de reservas. Consulta la disponibilidad en un solo lugar.”
- EN: “Check connection status and the last calendar update.”
- ES: “Consulta el estado de cada conexión y la última actualización del calendario.”

## Arquitectura de producto
- **Unified Calendar / Calendario unificado**
- **Channel Connections / Conexiones de canales**
- **Sync Activity / Actividad de sincronización**
- **Conflict Monitor / Monitor de conflictos**
- **Properties / Alojamientos**

## Revisión de nombre pendiente
1. Buscar `Channelora` y variantes fonéticas en la base de signos distintivos de la SIC (Colombia).
2. Consultar la base mundial de marcas de la OMPI y registros de los mercados prioritarios.
3. Evaluar clases de Niza 9 y 42, y considerar 35 u otras según los servicios finales, con asesoría profesional.
4. Consultar disponibilidad de `channelora.com`, `channelora.co` y variantes en un registrador en tiempo real.
5. Buscar coincidencias en buscadores, redes sociales, tiendas de aplicaciones, directorios SaaS y repositorios de software.
6. Encargar búsqueda de antecedentes y concepto de registrabilidad antes de presentar solicitud.

Referencias para iniciar la comprobación:
- SIC: https://www.sic.gov.co/propiedad-industrial
- OMPI Global Brand Database: https://branddb.wipo.int/
- ICANN Lookup: https://lookup.icann.org/

**No se ha confirmado disponibilidad de marca ni de dominios.** La elección de Channelora es provisional y se puede cambiar sin alterar la arquitectura técnica.
