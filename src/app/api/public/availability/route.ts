import { NextResponse } from "next/server";
import { allowAvailabilityRequest } from "@/lib/rate-limit";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import { availabilitySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  if (!allowAvailabilityRequest(forwarded || "unknown")) {
    return NextResponse.json(
      { error: "Muitas consultas. Aguarde um minuto." },
      { status: 429 },
    );
  }
  const url = new URL(request.url);
  const parsed = availabilitySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Parâmetros inválidos." },
      { status: 400 },
    );

  const supabase = createPublicServerClient();
  if (parsed.data.professional === "any") {
    const { data: business, error: businessError } = await supabase.rpc(
      "get_public_business",
      { p_slug: parsed.data.slug },
    );
    if (businessError || !business)
      return NextResponse.json(
        { error: "Empresa não encontrada." },
        { status: 404 },
      );
    const professionals = (
      (
        business as {
          professionals?: Array<{ id: string; service_ids: string[] }>;
        }
      ).professionals ?? []
    ).filter((professional) =>
      professional.service_ids.includes(parsed.data.service),
    );
    const results = await Promise.all(
      professionals.map(async (professional) => ({
        professionalId: professional.id,
        result: await supabase.rpc("get_public_availability", {
          p_slug: parsed.data.slug,
          p_professional_id: professional.id,
          p_service_id: parsed.data.service,
          p_date: parsed.data.date,
        }),
      })),
    );
    const bySlot: Record<string, string> = {};
    for (const item of results)
      for (const slot of item.result.data ?? [])
        if (!bySlot[slot.starts_at])
          bySlot[slot.starts_at] = item.professionalId;
    return NextResponse.json({
      slots: Object.keys(bySlot).sort(),
      professionalsBySlot: bySlot,
    });
  }
  const { data, error } = await supabase.rpc("get_public_availability", {
    p_slug: parsed.data.slug,
    p_professional_id: parsed.data.professional,
    p_service_id: parsed.data.service,
    p_date: parsed.data.date,
  });
  if (error)
    return NextResponse.json(
      { error: "Não foi possível consultar horários." },
      { status: 500 },
    );
  return NextResponse.json({
    slots: (data ?? []).map((item: { starts_at: string }) => item.starts_at),
  });
}
