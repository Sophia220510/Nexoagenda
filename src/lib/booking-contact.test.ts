import { describe, expect, it } from "vitest";
import {
  buildBookingWhatsappMessage,
  chooseBookingWhatsapp,
} from "./booking-contact";

describe("chooseBookingWhatsapp", () => {
  it("usa o WhatsApp do profissional quando ele autorizou", () => {
    expect(chooseBookingWhatsapp({ businessPhone: "+5511999990000", professionalPhone: "+5511988880000", professionalOptIn: true })).toBe("+5511988880000");
  });
  it("usa o WhatsApp do negócio como fallback", () => {
    expect(chooseBookingWhatsapp({ businessPhone: "+5511999990000", professionalPhone: "+5511988880000", professionalOptIn: false })).toBe("+5511999990000");
  });
  it("monta uma confirmação completa para o WhatsApp", () => {
    expect(
      buildBookingWhatsappMessage({
        customerName: "Caio",
        serviceName: "Corte",
        professionalName: "Pedro",
        dateLabel: "30/09/2026 às 13:00",
        confirmationCode: "a1b2c3",
      }),
    ).toContain("Código: NEXO-A1B2C3");
  });
});

