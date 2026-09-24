import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("normaliza telefone brasileiro", () => expect(normalizePhone("(11) 99999-9999")).toBe("+5511999999999"));
  it("preserva código do país", () => expect(normalizePhone("+55 11 98888-7777")).toBe("+5511988887777"));
  it("rejeita entradas curtas", () => expect(() => normalizePhone("123")).toThrow());
});
