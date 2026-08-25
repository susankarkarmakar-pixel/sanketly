import { describe, expect, it } from "vitest";
import { createStructuredAlert, parseStructuredAlert, serializeStructuredAlert } from "./index";

describe("structured alerts", () => {
  it("round-trips the complete alert payload", () => {
    const alert = createStructuredAlert({
      alertId: "alert-1",
      kind: "flood",
      priority: "critical",
      title: "বাঁধ ভেঙেছে",
      description: "উঁচু জায়গায় চলে যান",
      village: "Gazole",
      ward: "4",
      location: { latitude: 25.22, longitude: 87.65, accuracyMeters: 20 },
      createdAt: 1000,
      expiresAt: 5000,
    });
    expect(parseStructuredAlert(serializeStructuredAlert(alert))).toEqual(alert);
  });

  it("rejects incomplete or expired alert records", () => {
    expect(() => createStructuredAlert({ alertId: "alert-2", kind: "fire", priority: "high", title: "আগুন", description: "", village: "Gazole", createdAt: 1000, expiresAt: 5000 })).toThrow("Structured alert text is incomplete");
    expect(parseStructuredAlert(JSON.stringify({ schemaVersion: 1, alertId: "alert-3", kind: "sos", priority: "critical", title: "SOS", description: "সহায়তা", village: "Gazole", createdAt: 5000, expiresAt: 1000 }))).toBeNull();
  });
});
