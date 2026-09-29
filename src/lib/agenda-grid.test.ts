import { describe, expect, it } from "vitest";
import { intervalOverlapsSlot } from "./agenda-grid";

describe("intervalOverlapsSlot", () => {
  it("ocupa todos os intervalos cobertos pela duração do atendimento", () => {
    const appointmentStart = 10 * 60;
    const appointmentEnd = 10 * 60 + 45;

    expect(intervalOverlapsSlot(appointmentStart, appointmentEnd, 600, 15)).toBe(true);
    expect(intervalOverlapsSlot(appointmentStart, appointmentEnd, 615, 15)).toBe(true);
    expect(intervalOverlapsSlot(appointmentStart, appointmentEnd, 630, 15)).toBe(true);
    expect(intervalOverlapsSlot(appointmentStart, appointmentEnd, 645, 15)).toBe(false);
  });

  it("não bloqueia intervalos que apenas encostam no início ou fim", () => {
    expect(intervalOverlapsSlot(600, 630, 585, 15)).toBe(false);
    expect(intervalOverlapsSlot(600, 630, 630, 15)).toBe(false);
  });
});
