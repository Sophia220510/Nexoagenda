import { z } from "zod";

const RESERVED = new Set(["admin", "root", "api", "login", "auth", "support", "system"]);

export const usernameSchema = z.string().trim().toLowerCase().min(3, "Use pelo menos 3 caracteres.").max(32, "Use no máximo 32 caracteres.").regex(/^[a-z0-9][a-z0-9._-]*$/, "Use apenas letras sem acento, números, ponto, hífen ou underscore.").refine((value) => !RESERVED.has(value), "Esse usuário é reservado.");

export function normalizeUsername(value: string, allowPlatformAdmin = false) {
  const normalized = value.trim().toLowerCase();
  if (allowPlatformAdmin && normalized === "nexo.admin") return normalized;
  return usernameSchema.parse(normalized);
}

export function internalAuthIdentifier(username: string) {
  return `${username}@auth.nexo.invalid`;
}

export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}
