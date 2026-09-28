import { describe, expect, it } from "vitest";
import { getServicePresets } from "./service-presets";

describe("getServicePresets", () => {
  it("sugere um catálogo editável para barbearias", () => {
    expect(getServicePresets("BARBERSHOP").map(({ name }) => name)).toEqual([
      "Corte masculino",
      "Barba",
      "Corte + barba",
      "Sobrancelha",
    ]);
  });

  it("sugere serviços para salões e não sugere para outras categorias", () => {
    expect(getServicePresets("SALON")).toHaveLength(5);
    expect(getServicePresets("CLINIC")).toEqual([]);
  });

  it("retorna novas cópias para que a edição não altere o catálogo", () => {
    const first = getServicePresets("BARBERSHOP");
    first[0].name = "Editado";
    expect(getServicePresets("BARBERSHOP")[0].name).toBe("Corte masculino");
  });
});
