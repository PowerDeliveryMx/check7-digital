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
- `src/lib/monday.ts` — crea el item en el board **Check 7 Digital** (id
  `18431455073`) vía GraphQL y sube el PDF a su columna de archivo
  (`add_file_to_column`).

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
| `MONDAY_BOARD_ID` / `MONDAY_COL_*` | Tablero y columnas destino | No — ya traen como default el board real "Check 7 Digital" |

**Sin `RESEND_API_KEY`/`RESEND_FROM_EMAIL` el envío del comprobante falla** (es
el propósito principal del flujo). Monday, en cambio, es best-effort: si falla
o no está configurado (falta `MONDAY_API_TOKEN`), el correo se envía igual y el
técnico ve un aviso de que no se registró en Monday.

## Monday.com

Cada servicio crea un item nuevo (no actualiza leads existentes) en el board
**Check 7 Digital** (workspace Power Delivery, id `18431455073`), llenando:

- Nombre del item ← `cliente`
- Fecha de registro ← `fecha`
- ID ← `idCliente`
- Correo cliente ← `correoCliente`
- Check 7 (columna de archivo) ← el PDF del comprobante, adjunto directo

El resto de los datos del servicio (técnico, diagnóstico, calificación, etc.)
no se mandan a Monday — solo viven en el PDF que recibe el cliente. Si más
adelante se quiere más detalle en Monday, se agregan columnas al board y se
mapean en `src/lib/monday.ts`.

## Despliegue en Vercel

Ya desplegado: proyecto `power-delivery/check7-digital`, live en
https://check7-digital.vercel.app. Variables de entorno están cargadas en
Production vía dashboard/CLI (`npx vercel env add NOMBRE production`).

Para desplegar un cambio nuevo:

```bash
npx vercel deploy --prod
```

La conexión Git↔Vercel para auto-deploy en cada push todavía no está activada
(hace falta instalar la Vercel GitHub App desde Project → Settings → Git en
el dashboard); mientras tanto los despliegues son manuales con el comando de
arriba.

**Nota sobre `@sparticuz/chromium` en Vercel:** el file tracer de Next.js no
incluye el binario de Chromium por default aunque el paquete esté marcado
como externo — `next.config.ts` usa `outputFileTracingIncludes` para forzarlo.
Sin eso, `/api/submit` falla con `The input directory ".../chromium/bin" does
not exist`.

**Nota sobre el plan de Vercel:** generar el PDF con Chromium headless toma
unos segundos (cold start de Chromium + render + espera de fuentes) — en
production se ha visto entre 5 y 8s. `vercel.json` pide `maxDuration: 60` para
la función `api/submit`. El plan Hobby por default da 10s; si empieza a fallar
por timeout con tráfico real, hay que subir a Pro.

## Subdominio check.powerdelivery.mx

**Listo** — https://check.powerdelivery.mx está en vivo con SSL válido.

DNS administrado en Neubox (nameservers `ns143/144/245.neubox.net`) — **no**
son los de Vercel, así que el dominio se conecta con un registro `A`, no
cambiando nameservers (eso movería todo `powerdelivery.mx`, incluyendo el
sitio en Duda, a Vercel):

```
A   check   76.76.21.21
```

Dos cosas que causaron fricción al configurarlo, por si vuelve a pasar con
otro subdominio en Neubox:

1. El subdominio `check` estaba dado de alta como **addon domain** (hosting)
   en cPanel, y eso pisaba cualquier edición manual del registro `A` en la
   Zona DNS — hubo que eliminarlo de la lista de "Dominios" antes de que el
   registro manual se mantuviera.
2. El Zone Editor de Neubox tiene un botón separado **"Save All Records"** —
   sin darle clic ahí, los cambios se veían guardados en la fila pero nunca
   se publicaban a los nameservers reales (el serial del SOA no subía).

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
