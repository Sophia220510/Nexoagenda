import { afterEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalVercelUrl = process.env.VERCEL_URL;
afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  if (originalVercelUrl === undefined) delete process.env.VERCEL_URL;
  else process.env.VERCEL_URL = originalVercelUrl;
});

describe("PWA e SEO básicos", () => {
  it("declara ícones reais e separados para any e maskable", () => {
    const app = manifest();
    expect(app.name).toBe("NEXO Book");
    expect(app.display).toBe("standalone");
    expect(app.icons?.filter((icon) => icon.purpose === "any")).toHaveLength(2);
    expect(app.icons?.filter((icon) => icon.purpose === "maskable")).toHaveLength(2);
    for (const icon of app.icons ?? []) {
      const path = icon.src.split("?")[0].replace(/^\//, "");
      expect(existsSync(join(process.cwd(), "public", path))).toBe(true);
    }
  });

  it("mantém páginas privadas fora do rastreamento", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://nexobook.example";
    const result = robots();
    expect(result.sitemap).toBe("https://nexobook.example/sitemap.xml");
    expect(JSON.stringify(result.rules)).toContain("/painel");
    expect(JSON.stringify(result.rules)).toContain("/admin");
  });

  it("usa a URL configurada para links absolutos sem hardcode de deploy", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://nexobook.example/";
    expect(getSiteUrl()).toBe("https://nexobook.example");
    expect(absoluteUrl("/empresa")).toBe("https://nexobook.example/empresa");
  });
});
