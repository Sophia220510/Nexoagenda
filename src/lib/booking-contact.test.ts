import { describe, expect, it } from "vitest";
import { chooseBookingWhatsapp } from "./booking-contact";

describe("chooseBookingWhatsapp", () => {
  it("usa o WhatsApp do profissional quando ele autorizou", () => {
    expect(chooseBookingWhatsapp({ businessPhone: "+5511999990000", professionalPhone: "+5511988880000", professionalOptIn: true })).toBe("+5511988880000");
  });
  it("usa o WhatsApp do negócio como fallback", () => {
    expect(chooseBookingWhatsapp({ businessPhone: "+5511999990000", professionalPhone: "+5511988880000", professionalOptIn: false })).toBe("+5511999990000");
  });
});

