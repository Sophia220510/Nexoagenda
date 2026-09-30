import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/painel", "/admin", "/api", "/auth", "/onboarding", "/login", "/cadastro", "/esqueci-a-senha", "/redefinir-senha", "/trocar-senha"],
    }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
