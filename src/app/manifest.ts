import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEXO Book",
    short_name: "NEXO Book",
    description: "Agenda inteligente para negócios e profissionais.",
    start_url: "/painel",
    display: "standalone",
    background_color: "#f7f7f3",
    theme_color: "#0d120f",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/brand/nexo-mark.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
