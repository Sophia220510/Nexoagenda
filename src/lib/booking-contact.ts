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

