import { NextResponse } from "next/server";
import { allowBookingRequest } from "@/lib/rate-limit";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import { bookingSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const rateKey = forwarded || "unknown";
  if (!allowBookingRequest(rateKey)) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });

  const body: unknown = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = createPublicServerClient();
  const { data, error } = await supabase.rpc("book_public_appointment", {
    p_slug: parsed.data.slug,
    p_professional_id: parsed.data.professional_id,
    p_service_id: parsed.data.service_id,
    p_starts_at: parsed.data.starts_at,
    p_customer_name: parsed.data.customer_name,
    p_customer_phone: parsed.data.customer_phone,
    p_idempotency_key: parsed.data.idempotency_key,
  });

  if (error) {
    const conflict = error.code === "23P01" || error.message.includes("conflict");
    const notFound = error.code === "P0002";
    return NextResponse.json(
      { error: conflict ? "Este horário acabou de ser ocupado. Escolha outro." : notFound ? "Serviço ou profissional indisponível." : "Não foi possível confirmar o agendamento." },
      { status: conflict ? 409 : notFound ? 404 : 400 },
    );
  }

  return NextResponse.json({ appointment_id: data }, { status: 201 });
}

