import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: { default: "NEXO Book", template: "%s | NEXO Book" },
  description: "Agenda e gestão inteligente para negócios e profissionais.",
  applicationName: "NEXO Book",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "NEXO Book",
    title: "NEXO Book",
    description: "Agenda e gestão inteligente para negócios e profissionais.",
    images: ["/brand/nexo-mark.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
