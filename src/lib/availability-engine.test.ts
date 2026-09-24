import { describe, expect, it } from "vitest";
import { getAvailableSlotMinutes, getProfessionalDuration } from "./availability-engine";

describe("getProfessionalDuration", () => {
  it("usa a duração padrão quando não há override", () => expect(getProfessionalDuration(30, null)).toBe(30));
  it("prioriza o override do profissional", () => expect(getProfessionalDuration(30, 45)).toBe(45));
});

describe("getAvailableSlotMinutes", () => {
  const base = { workingHours: [{ start: 9 * 60, end: 18 * 60 }], durationMinutes: 120, granularityMinutes: 15 };

  it("só retorna slots que comportam a duração completa", () => {
    const slots = getAvailableSlotMinutes({ ...base, appointments: [], blockedTimes: [] });
    expect(slots.at(-1)).toBe(16 * 60);
  });

  it("remove candidatos que cruzam um agendamento", () => {
    const slots = getAvailableSlotMinutes({ ...base, appointments: [{ start: 14 * 60, end: 14 * 60 + 30 }], blockedTimes: [] });
    expect(slots).not.toContain(12 * 60 + 30);
    expect(slots).not.toContain(13 * 60 + 45);
  });

  it("respeita períodos bloqueados", () => {
    const slots = getAvailableSlotMinutes({ ...base, appointments: [], blockedTimes: [{ start: 11 * 60, end: 12 * 60 }] });
    expect(slots).not.toContain(10 * 60);
  });

  it("agendamento cancelado não bloqueia a agenda", () => {
    const slots = getAvailableSlotMinutes({ ...base, appointments: [{ start: 9 * 60, end: 11 * 60, cancelled: true }], blockedTimes: [] });
    expect(slots).toContain(9 * 60);
  });
});
