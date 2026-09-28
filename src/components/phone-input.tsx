"use client";

import { useState } from "react";

function maskBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function PhoneInput({ name = "phone", required = false, defaultValue = "" }: {
  name?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(maskBrazilianPhone(defaultValue));
  return (
    <input
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="(11) 99999-9999"
      value={value}
      minLength={14}
      maxLength={15}
      required={required}
      onChange={(event) => setValue(maskBrazilianPhone(event.target.value))}
    />
  );
}

