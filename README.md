# Check 7 Digital

Formulario digital del "Check 7" de Power Delivery (batería vs. alternador). El
técnico llena el formulario en el celular junto al cliente; al terminar se
genera un PDF del comprobante, se envía por correo al cliente (Resend) y se
crea un item en Monday.com con los datos del servicio.

El frontend (`public/check7.css` + `public/check7.js`) es una copia casi
literal del bosquejo `check7-digital-bosquejo.html` — mismo diseño, mismos
parámetros de aprobado/no aprobado, misma lógica de pantallas. Solo se le
conectó un backend real.

## Estructura

- `src/app/page.tsx` — monta el shell de la app y carga `public/check7.js`.
- `public/check7.css`, `public/check7.js` — UI y lógica del formulario (del bosquejo).
- `src/app/api/submit/route.ts` — recibe el estado del formulario + el HTML del
  comprobante ya renderizado en el navegador, genera el PDF, envía el correo y
  crea el item en Monday.
- `src/lib/pdf.ts` — genera el PDF con Puppeteer (`@sparticuz/chromium` en
  producción/Vercel, Chrome local en desarrollo).
- `src/lib/email.ts` — envío por Resend.
- `src/lib/monday.ts` — creación de item vía GraphQL de Monday.com.

El PDF se genera a partir del **mismo HTML que ve el técnico en pantalla**
(`document.querySelector('.ticket').outerHTML`), así que no hay una segunda
copia del diseño que se pueda desincronizar del bosquejo.

## Desarrollo local

Requiere Node 20+ (ya instalado vía `nvm` en esta máquina: `nvm use --lts`).

```bash
npm install
cp .env.example .env.local   # llena las variables que ya tengas
npm run dev
```

Abre http://localhost:3000.

Para probar la generación de PDF en local, Puppeteer necesita un Chrome de
escritorio (no el binario serverless). Por defecto busca
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; si tu Chrome
está en otro lado, define `CHROME_EXECUTABLE_PATH` en `.env.local`.

## Variables de entorno

Ver `.env.example` para la lista completa. Resumen:

| Variable | Para qué | Obligatoria |
|---|---|---|
| `RESEND_API_KEY` | Enviar el correo con el PDF | Sí |
| `RESEND_FROM_EMAIL` | Remitente (debe ser de un dominio verificado en Resend) | Sí |
| `MONDAY_API_TOKEN` | Crear el item en Monday | No (si falta, se omite Monday sin romper el envío) |
| `MONDAY_BOARD_ID` | Tablero donde crear el item | No (idem) |
| `MONDAY_COL_*` | Mapeo de columnas del tablero | No (cada columna se manda solo si su ID está definido) |

**Sin `RESEND_API_KEY`/`RESEND_FROM_EMAIL` el envío del comprobante falla** (es
el propósito principal del flujo). Monday, en cambio, es best-effort: si falla
o no está configurado, el correo se envía igual y el técnico ve un aviso de
que no se registró en Monday.

## Pendiente de definir con quien administra Monday

1. En qué tablero se crea el item por cada servicio (o si actualiza el lead
   existente del embudo — hoy este proyecto solo **crea** items nuevos, no
   actualiza existentes).
2. IDs de columna reales. Para obtenerlos:
   ```
   query { boards(ids: [TU_BOARD_ID]) { columns { id title type } } }
   ```
   en https://monday.com/developers/v2/try-it-yourself, y llenar los
   `MONDAY_COL_*` en `.env.local` / Vercel con esos IDs.
3. `MONDAY_GROUP_ID` si el item debe caer en un grupo específico del tablero.

## Despliegue en Vercel

```bash
npx vercel link
npx vercel env add RESEND_API_KEY
npx vercel env add RESEND_FROM_EMAIL
# ...y el resto de variables de .env.example que apliquen
npx vercel --prod
```

O conecta el repo de GitHub desde el dashboard de Vercel y define las
variables de entorno ahí (Settings → Environment Variables).

**Nota sobre el plan de Vercel:** generar el PDF con Chromium headless usa
bastante memoria y toma unos segundos (cold start de Chromium + render +
espera de fuentes). `vercel.json` ya pide 1769 MB y 60s de `maxDuration` para
la función `api/submit`. El plan Hobby limita esto (10s por defecto, hasta
1024 MB de memoria); si el envío falla por timeout en producción, lo más
probable es que se necesite plan Pro.

## Subdominio check.powerdelivery.mx

1. En Vercel: Project → Settings → Domains → agrega `check.powerdelivery.mx`.
2. Vercel te da el registro DNS exacto a crear (normalmente un `CNAME` a
   `cname.vercel-dns.com`, a veces un `A` a `76.76.21.21`).
3. En el DNS de `powerdelivery.mx` (fuera de este proyecto — es el proveedor
   donde esté administrado el dominio), crea ese registro para el host
   `check`.
4. Espera la propagación (minutos a un par de horas) y Vercel emitirá el
   certificado SSL automáticamente.

## Decisiones ya tomadas (ver brief original)

- Solo envío por correo (no WhatsApp).
- Sin modo offline.
- Subdominio aparte del sitio en Duda.
- Alternador con carga = 13.5–14.8V; batería retiene = ≥9.6V (No retiene <9V).
- Marca Power Delivery: azul `#0023EB`, naranja `#F1592A`.

## Cosas que decidí sin preguntar (revisar si no aplican)

- El folio ya no es un contador fijo (`61257` en el bosquejo) sino que se
  genera por sesión como `YYMMDD####` (fecha + 4 dígitos aleatorios), porque
  no hay una base de datos compartida entre técnicos que lleve un consecutivo
  único. Si Monday.com debe ser la fuente de verdad del folio, se puede
  cambiar para que el folio se asigne del lado del servidor al crear el item.
