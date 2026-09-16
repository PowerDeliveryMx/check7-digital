import fs from "node:fs";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

let cachedCss: string | null = null;
function getTicketCss(): string {
  if (!cachedCss) {
    cachedCss = fs.readFileSync(path.join(process.cwd(), "public", "check7.css"), "utf-8");
  }
  return cachedCss;
}

let cachedLogoDataUri: string | null = null;
function getLogoDataUri(): string {
  if (!cachedLogoDataUri) {
    const buf = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));
    cachedLogoDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  }
  return cachedLogoDataUri;
}

function buildTicketDocument(ticketHtml: string): string {
  const inlinedHtml = ticketHtml.split('src="/logo.png"').join(`src="${getLogoDataUri()}"`);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>${getTicketCss()}</style>
<style>
  html, body { background:#EEF1FB; margin:0; }
  body { display:flex; justify-content:center; padding:28px 0 36px; }
  .ticket { width:420px; margin:0; }
</style>
</head>
<body>${inlinedHtml}</body>
</html>`;
}

function isServerlessEnvironment(): boolean {
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.VERCEL || process.env.NETLIFY);
}

export async function renderTicketPdf(ticketHtml: string): Promise<Buffer> {
  const html = buildTicketDocument(ticketHtml);
  const serverless = isServerlessEnvironment();

  const executablePath = serverless
    ? await chromium.executablePath()
    : process.env.CHROME_EXECUTABLE_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  if (!serverless && !fs.existsSync(executablePath)) {
    throw new Error(
      `No se encontró Chrome en "${executablePath}" para generar el PDF en desarrollo local. ` +
        `Define CHROME_EXECUTABLE_PATH en .env.local apuntando a tu instalación de Chrome.`
    );
  }

  const browser = await puppeteer.launch({
    args: serverless ? chromium.args : [],
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 480, height: 800 });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const bodyHandle = await page.$("body");
    const box = await bodyHandle?.boundingBox();
    const heightPx = Math.ceil(box?.height ?? 1200);

    const pdf = await page.pdf({
      width: "480px",
      height: `${heightPx}px`,
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
