export function chooseBookingWhatsapp({
  businessPhone,
  professionalPhone,
  professionalOptIn,
}: {
  businessPhone: string;
  professionalPhone?: string | null;
  professionalOptIn?: boolean;
}) {
  return professionalOptIn && professionalPhone
    ? professionalPhone
    : businessPhone;
}

export function buildBookingWhatsappMessage({
  customerName,
  serviceName,
  professionalName,
  dateLabel,
  confirmationCode,
}: {
  customerName: string;
  serviceName: string;
  professionalName: string;
  dateLabel: string;
  confirmationCode: string;
}) {
  return [
    `Olá! Sou ${customerName} e estou confirmando meu agendamento pelo NEXO Book.`,
    "",
    `Serviço: ${serviceName}`,
    `Profissional: ${professionalName}`,
    `Data e horário: ${dateLabel}`,
    `Código: NEXO-${confirmationCode.toUpperCase()}`,
    "",
    "Meu horário já está reservado.",
  ].join("\n");
}

