import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const display = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "NEXO Book — Agenda e gestão inteligente para negócios", template: "%s | NEXO Book" },
  description: "Organize agenda, equipe e clientes em um só lugar. Compartilhe seu link para receber agendamentos online.",
  applicationName: "NEXO Book",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/favicon-32.png?v=2", sizes: "32x32", type: "image/png" }, { url: "/brand/favicon-16.png?v=2", sizes: "16x16", type: "image/png" }],
    apple: "/brand/apple-touch-icon.png?v=2",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "NEXO Book",
    title: "NEXO Book — Agenda e gestão inteligente para negócios",
    description: "Organize agenda, equipe e clientes em um só lugar.",
    images: [{ url: "/brand/opengraph.png?v=2", width: 1200, height: 630, alt: "NEXO Book — Agenda e gestão inteligente para negócios" }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <body>{children}{process.env.VERCEL === "1" && <Analytics />}</body>
    </html>
  );
}
