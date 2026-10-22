import type { Metadata } from "next";
import { DM_Sans, Nunito } from "next/font/google";
import "./globals.css";

const display = Nunito({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Hoshiko | Tu compañera cósmica", template: "%s | Hoshiko" },
  description: "Hoshiko combina moderación asistida por IA, herramientas para tu staff e interacciones con personalidad para comunidades de Discord.",
  icons: { icon: "/icon.svg" },
  openGraph: { title: "Hoshiko | Una experiencia más humana para Discord", description: "Moderación asistida por IA, herramientas para el staff e interacciones con personalidad.", images: ["/og-hoshiko.svg"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" suppressHydrationWarning><body suppressHydrationWarning className={`${display.variable} ${body.variable}`}>{children}</body></html>;
}
