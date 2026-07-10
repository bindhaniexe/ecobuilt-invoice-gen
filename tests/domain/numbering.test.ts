import { describe, expect, it } from "vitest";

import { generateInvoiceNumber } from "@/domain/invoices/numbering";

describe("generateInvoiceNumber", () => {
  it("uses the Indian financial year and next sequence", () => {
    const number = generateInvoiceNumber(new Date("2026-07-10"), [
      "INV-2026-27-0001",
      "INV-2026-27-0008",
      "INV-2025-26-0100",
    ]);

    expect(number).toBe("INV-2026-27-0009");
  });

  it("uses the previous calendar year before April", () => {
    expect(generateInvoiceNumber(new Date("2027-03-31"), [])).toBe(
      "INV-2026-27-0001",
    );
  });
});
