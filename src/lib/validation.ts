import { z } from "zod";
import { DEFAULT_TIMEZONE, RESERVED_SLUGS } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";

const trimmedName = z.string().trim().min(2, "Use pelo menos 2 caracteres.").max(120);
const uuid = z.string().uuid("Identificador inválido.");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens.")
  .refine((slug) => !RESERVED_SLUGS.includes(slug as (typeof RESERVED_SLUGS)[number]), {
    message: "Esse endereço é reservado.",
  });

const phoneSchema = z.string().transform((value, ctx) => {
  try {
    return normalizePhone(value);
  } catch (error) {
    ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Telefone inválido." });
    return z.NEVER;
  }
});

export const onboardingSchema = z.object({
  name: trimmedName,
  slug: slugSchema,
  phone: phoneSchema,
  timezone: z.string().trim().min(3).max(64).default(DEFAULT_TIMEZONE),
});

export const serviceSchema = z.object({
  name: trimmedName,
  description: z.string().trim().max(1000).optional().transform((v) => v || null),
  price_cents: z.coerce.number().int().min(0).max(100_000_000),
  default_duration_minutes: z.coerce.number().int().min(5).max(720),
});

export const professionalSchema = z.object({
  name: trimmedName,
  photo_url: z.union([z.literal(""), z.string().url()]).optional().transform((v) => v || null),
  bio: z.string().trim().max(1000).optional().transform((v) => v || null),
  service_ids: z.array(uuid).default([]),
});

export const workingHourSchema = z.object({
  professional_id: uuid,
  weekday: z.coerce.number().int().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
}).refine((value) => value.start_time < value.end_time, {
  message: "O início deve ser anterior ao fim.",
  path: ["end_time"],
});

export const bookingSchema = z.object({
  slug: slugSchema,
  professional_id: uuid,
  service_id: uuid,
  starts_at: z.string().datetime({ offset: true }),
  customer_name: trimmedName,
  customer_phone: phoneSchema,
  idempotency_key: uuid,
});

export const availabilitySchema = z.object({
  slug: slugSchema,
  professional: uuid,
  service: uuid,
  date: z.string().date(),
});

