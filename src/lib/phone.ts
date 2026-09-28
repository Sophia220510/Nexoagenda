export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const withCountry =
    digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;

  if (
    withCountry.length < 10 ||
    withCountry.length > 15 ||
    withCountry.startsWith("0")
  ) {
    throw new Error("Informe um telefone válido com DDD.");
  }

  if (withCountry.startsWith("55")) {
    const national = withCountry.slice(2);
    const ddd = Number(national.slice(0, 2));
    const validDdds = new Set([
      11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32,
      33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53,
      54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
      79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96,
      97, 98, 99,
    ]);
    if (
      !validDdds.has(ddd) ||
      ![10, 11].includes(national.length) ||
      /^(\d)\1+$/.test(national) ||
      national.slice(2).startsWith("0")
    ) {
      throw new Error("Informe um telefone brasileiro válido com DDD.");
    }
  }

  return `+${withCountry}`;
}

export function formatPhone(value: string) {
  if (value.startsWith("+55") && value.length === 14) {
    return value.replace(/^\+55(\d{2})(\d{4})(\d{4})$/, "+55 ($1) $2-$3");
  }
  if (value.startsWith("+55") && value.length === 15) {
    return value.replace(/^\+55(\d{2})(\d{5})(\d{4})$/, "+55 ($1) $2-$3");
  }
  return value;
}
