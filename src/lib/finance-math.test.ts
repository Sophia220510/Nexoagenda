import { describe, expect, it } from "vitest";
import { cashBalance, professionalShare } from "./finance-math";

describe("financial models", () => {
  it("não desconta comissão apenas gerada do saldo", () => {
    expect(cashBalance({ businessNetReceived: 6000, expenses: 0, paidCommissions: 0 })).toBe(6000);
    expect(cashBalance({ businessNetReceived: 6000, expenses: 0, paidCommissions: 2400 })).toBe(3600);
  });
  it("calcula os quatro modelos", () => {
    expect(professionalShare(5000, "PROFESSIONAL_KEEPS_ALL", 0)).toBe(5000);
    expect(professionalShare(5000, "BUSINESS_KEEPS_ALL", 0)).toBe(0);
    expect(professionalShare(5000, "PERCENTAGE_COMMISSION", 4000)).toBe(2000);
    expect(professionalShare(5000, "FIXED_COMMISSION", 1500)).toBe(1500);
  });
});

