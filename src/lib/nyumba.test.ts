import { describe, expect, it } from "vitest";
import { arrears, isValidMpesaCode } from "./nyumba";

describe("M-PESA code", () => {
  it("accepts a 10-character code, case-insensitive", () => {
    expect(isValidMpesaCode("sjk3h7lq2x")).toBe(true);
  });
  it("rejects short codes", () => {
    expect(isValidMpesaCode("ABC123")).toBe(false);
  });
});

describe("arrears", () => {
  it("counts only unpaid balance after approved payments", () => {
    const bills = [
      { id: "a", amount: 10000, status: "unpaid" },
      { id: "b", amount: 8000, status: "paid" },
    ];
    const payments = [
      { bill_id: "a", amount: 4000, status: "approved" },
      { bill_id: "a", amount: 6000, status: "pending" },
    ];
    expect(arrears(bills, payments)).toBe(6000);
  });
});
