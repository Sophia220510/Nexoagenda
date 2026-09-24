export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const withCountry = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;

  if (withCountry.length < 10 || withCountry.length > 15 || withCountry.startsWith("0")) {
    throw new Error("Informe um telefone válido com DDD.");
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

