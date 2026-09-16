import { Resend } from "resend";
import type { Check7State } from "./check7-schema";

function buildEmailHtml(state: Check7State): string {
  const firstName = state.cliente?.trim().split(" ")[0] || "";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#12142A;max-width:480px;margin:0 auto;line-height:1.5;">
    <p>Hola${firstName ? " " + firstName : ""},</p>
    <p>Gracias por confiar en <strong>Power Delivery</strong>. Adjunto encontrarás el comprobante de tu servicio
    Check&nbsp;7 (folio <strong>${state.folio}</strong>).</p>
    <p style="color:#565973;font-size:13px;">
      Si tienes dudas sobre tu garantía o el diagnóstico, responde este correo o visita
      <a href="https://www.powerdelivery.mx" style="color:#0023EB;">www.powerdelivery.mx</a>.
    </p>
    <p style="color:#9A9DBE;font-size:12px;margin-top:24px;">Power Delivery · Check 7</p>
  </div>`;
}

export async function sendReportEmail(opts: {
  to: string;
  state: Check7State;
  pdfBuffer: Buffer;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurada.");
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "Power Delivery <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: `Tu comprobante Check 7 · Folio ${opts.state.folio}`,
    html: buildEmailHtml(opts.state),
    attachments: [
      {
        filename: `check7-${opts.state.folio}.pdf`,
        content: opts.pdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(error.message || "Resend rechazó el envío del correo.");
  }
}
