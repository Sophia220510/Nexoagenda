export const ADMIN_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ADMIN_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateAdminImage(file: { size: number; type: string }) {
  if (!ADMIN_IMAGE_TYPES.includes(file.type as (typeof ADMIN_IMAGE_TYPES)[number]))
    return "Envie uma imagem JPG, PNG ou WebP.";
  if (file.size <= 0) return "O arquivo está vazio.";
  if (file.size > ADMIN_IMAGE_MAX_BYTES)
    return "A imagem deve ter no máximo 5 MB.";
  return null;
}

export function imageExtension(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
