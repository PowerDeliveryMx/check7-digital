import type { Check7State } from "./check7-schema";

const DEFAULT_BOARD_ID = "18431455073";
const DEFAULT_COL_FECHA = "date4";
const DEFAULT_COL_ID_CLIENTE = "text_mm78scw3";
const DEFAULT_COL_CORREO = "email_mm7827d4";
const DEFAULT_COL_PDF = "file_mm78g7t1";

function mondayConfig() {
  const token = process.env.MONDAY_API_TOKEN;
  const boardId = process.env.MONDAY_BOARD_ID || DEFAULT_BOARD_ID;
  if (!token) return null;
  return {
    token,
    boardId,
    colFecha: process.env.MONDAY_COL_FECHA || DEFAULT_COL_FECHA,
    colIdCliente: process.env.MONDAY_COL_ID_CLIENTE || DEFAULT_COL_ID_CLIENTE,
    colCorreo: process.env.MONDAY_COL_CORREO || DEFAULT_COL_CORREO,
    colPdf: process.env.MONDAY_COL_PDF || DEFAULT_COL_PDF,
  };
}

async function mondayGraphql(token: string, query: string, variables: Record<string, unknown>) {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors?.length) {
    throw new Error(json.errors?.[0]?.message || `Monday.com respondió ${res.status}.`);
  }
  return json.data;
}

async function createItem(
  cfg: NonNullable<ReturnType<typeof mondayConfig>>,
  state: Check7State
): Promise<string> {
  const columnValues: Record<string, unknown> = {
    [cfg.colFecha]: { date: state.fecha },
    [cfg.colIdCliente]: state.idCliente,
    [cfg.colCorreo]: { email: state.correoCliente, text: state.correoCliente },
  };

  const itemName = state.cliente || `Cliente sin nombre (folio ${state.folio})`;

  const query = `mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
    create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
      id
    }
  }`;

  const data = await mondayGraphql(cfg.token, query, {
    boardId: cfg.boardId,
    itemName,
    columnValues: JSON.stringify(columnValues),
  });

  return data.create_item.id as string;
}

async function uploadPdfToItem(
  cfg: NonNullable<ReturnType<typeof mondayConfig>>,
  itemId: string,
  pdfBuffer: Buffer,
  filename: string
): Promise<void> {
  const query = `mutation ($itemId: ID!, $columnId: String!, $file: File!) {
    add_file_to_column(item_id: $itemId, column_id: $columnId, file: $file) {
      id
    }
  }`;

  const form = new FormData();
  form.append(
    "query",
    query
  );
  form.append(
    "map",
    JSON.stringify({ file: ["variables.file"] })
  );
  form.append(
    "variables",
    JSON.stringify({ itemId, columnId: cfg.colPdf, file: null })
  );
  form.append("file", new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), filename);

  const res = await fetch("https://api.monday.com/v2/file", {
    method: "POST",
    headers: {
      Authorization: cfg.token,
      "API-Version": "2024-10",
    },
    body: form,
  });
  const json = await res.json();
  if (!res.ok || json.errors?.length) {
    throw new Error(json.errors?.[0]?.message || `Monday.com (subida de archivo) respondió ${res.status}.`);
  }
}

export async function createMondayItem(
  state: Check7State,
  pdfBuffer: Buffer
): Promise<{ skipped: true } | { id: string }> {
  const cfg = mondayConfig();
  if (!cfg) return { skipped: true };

  const itemId = await createItem(cfg, state);
  await uploadPdfToItem(cfg, itemId, pdfBuffer, `check7-${state.folio}.pdf`);

  return { id: itemId };
}
