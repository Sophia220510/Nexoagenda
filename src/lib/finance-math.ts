export function cashBalance({
  businessNetReceived,
  expenses,
  paidCommissions,
}: {
  businessNetReceived: number;
  expenses: number;
  paidCommissions: number;
}) {
  return businessNetReceived - expenses - paidCommissions;
}

export function professionalShare(total: number, model: "PROFESSIONAL_KEEPS_ALL" | "BUSINESS_KEEPS_ALL" | "PERCENTAGE_COMMISSION" | "FIXED_COMMISSION", value: number) {
  if (model === "PROFESSIONAL_KEEPS_ALL") return total;
  if (model === "BUSINESS_KEEPS_ALL") return 0;
  if (model === "PERCENTAGE_COMMISSION") return Math.round(total * value / 10_000);
  return Math.min(total, value);
}

