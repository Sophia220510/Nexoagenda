import { describe, expect, it } from "vitest";
import { bookingSchema, slugSchema } from "./validation";

describe("slugSchema", () => {
  it("aceita slug URL-safe", () => expect(slugSchema.parse("barbearia-central")).toBe("barbearia-central"));
  it("rejeita rota reservada", () => expect(slugSchema.safeParse("painel").success).toBe(false));
  it("rejeita espaços e acentos", () => expect(slugSchema.safeParse("Salão Legal").success).toBe(false));
});

describe("bookingSchema", () => {
  it("não aceita IDs arbitrários ou data local sem offset", () => {
    const result = bookingSchema.safeParse({ slug: "barbearia-central", professional_id: "x", service_id: "x", starts_at: "2027-01-01 10:00", customer_name: "Ana", customer_phone: "11999999999", idempotency_key: "x" });
    expect(result.success).toBe(false);
  });
});
