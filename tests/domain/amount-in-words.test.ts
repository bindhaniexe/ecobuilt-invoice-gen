import { describe, expect, it } from "vitest";

import { amountToIndianWords } from "@/domain/invoices/amount-in-words";

describe("amountToIndianWords", () => {
  it("formats whole rupee amounts with Indian grouping", () => {
    expect(amountToIndianWords(1234567)).toBe(
      "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees Only",
    );
  });

  it("includes paise when the amount has decimals", () => {
    expect(amountToIndianWords(1001.5)).toBe(
      "One Thousand One Rupees and Fifty Paise Only",
    );
  });

  it("handles zero", () => {
    expect(amountToIndianWords(0)).toBe("Zero Rupees Only");
  });
});
