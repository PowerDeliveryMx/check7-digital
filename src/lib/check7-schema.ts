import { z } from "zod";

const ynSchema = z.boolean().nullable();

export const check7StateSchema = z.object({
  folio: z.string().min(1),
  fecha: z.string().min(1),
  tecnico: z.string().default(""),
  idCliente: z.string().default(""),
  vehiculo: z.object({
    modelo: z.string().default(""),
    anio: z.string().default(""),
    placa: z.string().default(""),
  }),
  kilometraje: z.string().default(""),
  cliente: z.string().default(""),
  correoCliente: z.string().email(),
  pre: z.object({
    enciende: ynSchema,
    estereo: ynSchema,
    sujetador: ynSchema,
    seguros: ynSchema,
    testigos: ynSchema,
    testigosCuales: z.string().default(""),
    observaciones: z.string().default(""),
  }),
  volts: z.record(z.string(), z.string()),
  stabilizeDone: z.record(z.string(), z.boolean()),
  diag: z.object({
    bateriaNueva: ynSchema,
    alternador: ynSchema,
  }),
  serv: z.record(z.string(), z.boolean().nullable()),
  eval: z.object({
    calificacion: z.enum(["bien", "regular", "mal"]).nullable(),
    comentarios: z.string().default(""),
    nombreCliente: z.string().default(""),
    firmado: z.boolean().default(false),
  }),
});

export const submitBodySchema = z.object({
  state: check7StateSchema,
  ticketHtml: z.string().min(20),
});

export type Check7State = z.infer<typeof check7StateSchema>;
export type SubmitBody = z.infer<typeof submitBodySchema>;
