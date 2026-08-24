import type { AlertRecord, StructuredAlert } from "@sanketly/domain";

export function alertSummary(alert: StructuredAlert): string {
  return `${alert.title} · ${alert.village}`;
}

export function deliveryLabel(state: AlertRecord["deliveryState"]): string {
  if (state === "delivered") return "পৌঁছেছে";
  if (state === "queued") return "কিউতে আছে";
  if (state === "relaying") return "এগিয়ে যাচ্ছে";
  if (state === "failed") return "ব্যর্থ";
  if (state === "expired") return "মেয়াদ শেষ";
  return "অবস্থা জানা নেই";
}

export function sortAlertRecords(records: AlertRecord[]): AlertRecord[] {
  return [...records].sort((left, right) => right.updatedAt - left.updatedAt);
}
