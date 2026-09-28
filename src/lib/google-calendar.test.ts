import { describe, expect, it } from "vitest";
import { buildGoogleCalendarUrl } from "./google-calendar";

describe("buildGoogleCalendarUrl", () => {
  it("abre um evento preenchido no Google Agenda sem baixar arquivo", () => {
    const url = new URL(buildGoogleCalendarUrl({
      title: "Barba — NEXO Demo",
      start: new Date("2026-09-30T16:00:00.000Z"),
      end: new Date("2026-09-30T16:30:00.000Z"),
      timezone: "America/Sao_Paulo",
      details: "Agendamento com Rafael",
      location: "São Paulo",
    }));
    expect(url.origin).toBe("https://calendar.google.com");
    expect(url.pathname).toBe("/calendar/r/eventedit");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20260930T160000Z/20260930T163000Z");
    expect(url.searchParams.get("text")).toBe("Barba — NEXO Demo");
  });
});

