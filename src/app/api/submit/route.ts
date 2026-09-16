import { NextRequest, NextResponse } from "next/server";
import { submitBodySchema } from "@/lib/check7-schema";
import { renderTicketPdf } from "@/lib/pdf";
import { sendReportEmail } from "@/lib/email";
import { createMondayItem } from "@/lib/monday";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let state, ticketHtml;
  try {
    const json = await req.json();
    const parsed = submitBodySchema.parse(json);
    state = parsed.state;
    ticketHtml = parsed.ticketHtml;
  } catch {
    return NextResponse.json({ ok: false, error: "Datos del formulario inválidos." }, { status: 400 });
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderTicketPdf(ticketHtml);
  } catch (err) {
    console.error("[submit] PDF generation failed", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo generar el PDF del comprobante." },
      { status: 500 }
    );
  }

  try {
    await sendReportEmail({ to: state.correoCliente, state, pdfBuffer });
  } catch (err) {
    console.error("[submit] Email send failed", err);
    const message = err instanceof Error ? err.message : "No se pudo enviar el correo.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  let mondayError: string | undefined;
  try {
    await createMondayItem(state);
  } catch (err) {
    console.error("[submit] Monday.com item creation failed", err);
    mondayError = err instanceof Error ? err.message : "Error desconocido en Monday.com.";
  }

  return NextResponse.json({ ok: true, mondayError });
}
