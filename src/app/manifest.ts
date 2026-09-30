import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEXO Book",
    short_name: "NEXO Book",
    description: "Agenda e gestão inteligente para negócios e profissionais.",
    start_url: "/painel",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0d120f",
    orientation: "portrait-primary",
    icons: [
      { src: "/brand/app-192.png?v=2", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/app-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/maskable-192.png?v=2", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/brand/maskable-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
