import { addDays, addMonths, startOfMonth } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type FinancialPeriod =
  "today" | "yesterday" | "7d" | "30d" | "month" | "previous_month";

export function financialPeriod(
  period: string | undefined,
  timezone: string,
  now = new Date(),
) {
  const key: FinancialPeriod = [
    "today",
    "yesterday",
    "7d",
    "30d",
    "month",
    "previous_month",
  ].includes(period ?? "")
    ? (period as FinancialPeriod)
    : "today";
  const localDate = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const today = fromZonedTime(`${localDate} 00:00:00`, timezone);
  if (key === "yesterday")
    return { key, start: addDays(today, -1), end: today, label: "Ontem" };
  if (key === "7d")
    return {
      key,
      start: addDays(today, -6),
      end: addDays(today, 1),
      label: "Últimos 7 dias",
    };
  if (key === "30d")
    return {
      key,
      start: addDays(today, -29),
      end: addDays(today, 1),
      label: "Últimos 30 dias",
    };
  if (key === "month")
    return {
      key,
      start: startOfMonth(today),
      end: addMonths(startOfMonth(today), 1),
      label: "Este mês",
    };
  if (key === "previous_month") {
    const end = startOfMonth(today);
    return { key, start: addMonths(end, -1), end, label: "Mês anterior" };
  }
  return { key, start: today, end: addDays(today, 1), label: "Hoje" };
}
