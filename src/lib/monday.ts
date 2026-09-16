import type { Check7State } from "./check7-schema";

/**
 * Column IDs are board-specific and not known until the user shares the real
 * Monday.com board. Each MONDAY_COL_* env var is optional: a column is only
 * sent if its ID is configured, so this can be wired up incrementally.
 */
function col(id: string | undefined, value: unknown): Record<string, unknown> {
  return id ? { [id]: value } : {};
}

function diagLabel(v: boolean | null): string {
  return v === true ? "Funciona" : v === false ? "No funciona" : "";
}

function activeServiceLabels(state: Check7State): string {
  return Object.entries(state.serv)
    .filter(([, v]) => v === true)
    .map(([k]) => k)
    .join(", ");
}

export async function createMondayItem(
  state: Check7State
): Promise<{ skipped: true } | { id: string | undefined }> {
  const token = process.env.MONDAY_API_TOKEN;
  const boardId = process.env.MONDAY_BOARD_ID;
  if (!token || !boardId) {
    return { skipped: true };
  }

  const columnValues: Record<string, unknown> = {
    ...col(process.env.MONDAY_COL_FOLIO, state.folio),
    ...col(process.env.MONDAY_COL_FECHA, { date: state.fecha }),
    ...col(process.env.MONDAY_COL_TECNICO, state.tecnico),
    ...col(process.env.MONDAY_COL_ID_CLIENTE, state.idCliente),
    ...col(process.env.MONDAY_COL_CORREO, { email: state.correoCliente, text: state.correoCliente }),
    ...col(process.env.MONDAY_COL_VEHICULO, `${state.vehiculo.modelo} ${state.vehiculo.anio}`.trim()),
    ...col(process.env.MONDAY_COL_PLACA, state.vehiculo.placa),
    ...col(process.env.MONDAY_COL_KM, state.kilometraje),
    ...col(process.env.MONDAY_COL_DIAG_BATERIA, diagLabel(state.diag.bateriaNueva)),
    ...col(process.env.MONDAY_COL_DIAG_ALTERNADOR, diagLabel(state.diag.alternador)),
    ...col(process.env.MONDAY_COL_CALIFICACION, state.eval.calificacion || ""),
    ...col(process.env.MONDAY_COL_SERVICIOS, activeServiceLabels(state)),
  };

  const itemName = `Check 7 · Folio ${state.folio}${state.cliente ? " · " + state.cliente : ""}`;

  const query = `mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!, $groupId: String) {
    create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $columnValues) {
      id
    }
  }`;

  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({
      query,
      variables: {
        boardId,
        itemName,
        columnValues: JSON.stringify(columnValues),
        groupId: process.env.MONDAY_GROUP_ID || null,
      },
    }),
  });

  const json = await res.json();
  if (!res.ok || json.errors?.length) {
    const message = json.errors?.[0]?.message || `Monday.com respondió ${res.status}.`;
    throw new Error(message);
  }

  return { id: json.data?.create_item?.id as string | undefined };
}
