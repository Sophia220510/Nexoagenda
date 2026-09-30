export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const deployment = process.env.VERCEL_URL?.trim();
  const value = configured || (deployment ? `https://${deployment}` : "http://localhost:3000");
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function absoluteUrl(path: string) {
  return new URL(path, `${getSiteUrl()}/`).toString();
}
