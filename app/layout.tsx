import type { Metadata } from "next";
import { DM_Sans, Nunito } from "next/font/google";
import "./globals.css";

const display = Nunito({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Hoshiko | Tu compañera cósmica", template: "%s | Hoshiko" },
  description: "Hoshiko es una kitsune para comunidades de Discord: cercana, curiosa y siempre lista para echar una pata.",
  icons: { icon: "/icon.svg" },
  openGraph: { title: "Hoshiko | Tu compañera cósmica", description: "Conoce a Hoshiko, tu kitsune de cerezo para Discord.", images: ["/og-hoshiko.svg"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${display.variable} ${body.variable}`}>{children}</body></html>;
}
