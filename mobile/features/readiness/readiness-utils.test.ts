import { describe, expect, it } from "vitest";
import { readinessCopy } from "./readiness-copy";

describe("SSA readiness copy", () => {
  it("localizes ready and blocked states", () => {
    expect(readinessCopy("ready", "bn")).toBe("প্রস্তুত");
    expect(readinessCopy("blocked", "hi")).toBe("समस्या");
    expect(readinessCopy("needs-attention", "en")).toBe("Needs attention");
  });

  it("keeps not-required and checking states explicit", () => {
    expect(readinessCopy("not-required", "bn")).toBe("প্রয়োজন নেই");
    expect(readinessCopy("checking", "en")).toBe("Checking");
  });
});
