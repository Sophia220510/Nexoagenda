import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { imageExtension, validateAdminImage } from "@/lib/admin-upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const membership = await requireOwner();
  const formData = await request.formData();
  const file = formData.get("file");
  const scope = formData.get("scope") === "logos" ? "logos" : "profiles";

  if (!(file instanceof File))
    return NextResponse.json({ error: "Selecione uma imagem." }, { status: 400 });
  const validationError = validateAdminImage(file);
  if (validationError)
    return NextResponse.json({ error: validationError }, { status: 400 });

  const path = `${membership.business_id}/${scope}/${crypto.randomUUID()}.${imageExtension(file.type)}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("business-assets")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error)
    return NextResponse.json(
      { error: "Não foi possível enviar a imagem." },
      { status: 500 },
    );
  const { data } = admin.storage.from("business-assets").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
