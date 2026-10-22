"use client";

import Link from "next/link";
import { useState } from "react";
import { SHOW_LEGAL_LINKS, siteConfig } from "@/lib/config";
import { Container } from "@/components/layout/Container";

const links = [["#sobre-hoshiko", "Sobre Hoshiko"], ["#funciones", "Funciones"], ["#retrato", "Un retrato"], ["#cuidar", "Cuidar la comunidad"]] as const;

export default function LandingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="site-shell"><header className="site-header"><Container className="nav-inner"><Link className="brand" href="#inicio" aria-label="Hoshiko, volver al inicio" onClick={() => setMenuOpen(false)}><span className="brand-mark" aria-hidden="true">H</span><span><strong>Hoshiko</strong><small>TU COMPAÑERA CÓSMICA</small></span></Link><button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen((open) => !open)}><span className="sr-only">{menuOpen ? "Cerrar menú" : "Abrir menú"}</span><span aria-hidden="true">{menuOpen ? "×" : "☰"}</span></button><nav id="main-navigation" className={menuOpen ? "is-open" : ""} aria-label="Navegación principal">{links.map(([href, label]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}<a className="button button-small mobile-nav-cta" href={siteConfig.inviteUrl}>Invitar a Hoshiko <span aria-hidden="true">↗</span></a></nav><a className="button button-small desktop-nav-cta" href={siteConfig.inviteUrl}>Invitar a Hoshiko <span aria-hidden="true">↗</span></a></Container></header>{children}<footer className="site-footer"><Container className="footer-inner"><span>© Hoshiko&apos;s Realm</span><span>Hecha de cerezo, estrellas y un poquito de magia.</span>{SHOW_LEGAL_LINKS && <nav aria-label="Información legal"><Link href={siteConfig.privacyPath}>Privacidad</Link><Link href={siteConfig.termsPath}>Términos</Link></nav>}</Container></footer></div>;
}
