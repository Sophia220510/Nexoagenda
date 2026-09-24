import { NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import { availabilitySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = availabilitySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });

  const supabase = createPublicServerClient();
  const { data, error } = await supabase.rpc("get_public_availability", {
    p_slug: parsed.data.slug,
    p_professional_id: parsed.data.professional,
    p_service_id: parsed.data.service,
    p_date: parsed.data.date,
  });
  if (error) return NextResponse.json({ error: "Não foi possível consultar horários." }, { status: 500 });
  return NextResponse.json({ slots: (data ?? []).map((item: { starts_at: string }) => item.starts_at) });
}

