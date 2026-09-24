"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText = "Salvando...", className = "button" }: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending ? pendingText : children}</button>;
}

