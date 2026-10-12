import { ApiError } from "../api/client";
import type { EventDetails } from "../api/types";

export type SalesPanel = "cancelled" | "closed" | "open";

export function salesPanel(event: Pick<EventDetails, "cancelledAt" | "salesClosed">): SalesPanel {
  if (event.cancelledAt) return "cancelled";
  if (event.salesClosed) return "closed";
  return "open";
}

export const isSalesClosedError = (error: unknown) => error instanceof ApiError && error.problemType === "sales-closed";
