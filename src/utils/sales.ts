import { ApiError } from "../api/client";
import type { EventDetails } from "../api/types";

export type SalesPanel = "cancelled" | "closed" | "open";

export const SALES_CLOSED_MESSAGE = "As vendas deste evento foram encerradas.";

export function salesPanel(event: Pick<EventDetails, "cancelledAt" | "salesClosed">): SalesPanel {
  if (event.cancelledAt) return "cancelled";
  if (event.salesClosed) return "closed";
  return "open";
}

export const isSalesClosedError = (error: unknown) => error instanceof ApiError && error.problemType === "sales-closed";

export function orderErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (isSalesClosedError(error)) return SALES_CLOSED_MESSAGE;
  return error instanceof Error ? error.message : null;
}
