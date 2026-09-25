"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText = "Salvando...", className = "button", disabled = false }: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending || disabled}>{pending ? pendingText : children}</button>;
}
