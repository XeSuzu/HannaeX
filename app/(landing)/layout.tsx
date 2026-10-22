"use client";


import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { SHOW_LEGAL_LINKS, siteConfig } from "@/lib/config";
import { Container } from "@/components/layout/Container";
import { ExternalNavigationMenu, landingNavigationLinks } from "@/components/landing/ExternalNavigationMenu";

const links = landingNavigationLinks;
const inviteConfigured = siteConfig.inviteUrl !== "#invitar";

function InviteAction({ mobile = false }: { mobile?: boolean }) {
  const className = `button button-small ${mobile ? "mobile-nav-cta" : "desktop-nav-cta"}`;
  if (!inviteConfigured) return <span className={`${className} button-disabled`} aria-disabled="true">Invitación próximamente</span>;
  return <a className={className} href={siteConfig.inviteUrl}>Invitar a Hoshiko <span aria-hidden="true">↗</span></a>;
}

export default function LandingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="site-shell"><a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <Container className="nav-inner">
          <Link className="brand" href="#inicio" aria-label="Hoshiko, volver al inicio" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark" aria-hidden="true">H</span>
            <span><strong translate="no">Hoshiko</strong><small>TU COMPAÑERA CÓSMICA</small></span>
          </Link>
          <button ref={menuButtonRef} className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen((open) => !open)}>
            <span className="sr-only">{menuOpen ? "Cerrar menú" : "Abrir menú"}</span>
            <span className={`menu-icon ${menuOpen ? "is-open" : ""}`} aria-hidden="true"><i /><i /><i /></span>
          </button>
          <AnimatePresence initial={false}>
            {menuOpen && <motion.nav id="main-navigation" className="is-open" aria-label="Navegación principal" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              {links.map(([href, label]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}
              <InviteAction mobile />
            </motion.nav>}
          </AnimatePresence>
          <div className="desktop-external-nav" aria-label="Secciones principales"><ExternalNavigationMenu /></div>
          <InviteAction />
        </Container>
      </header>
      {children}
      <footer className="site-footer">
        <Container className="footer-inner">
          <span>© Hoshiko&apos;s Realm</span>
          <span>Hecha de cerezo, estrellas y un poquito de magia.</span>
          {SHOW_LEGAL_LINKS && <nav aria-label="Información legal"><Link href={siteConfig.privacyPath}>Privacidad</Link><Link href={siteConfig.termsPath}>Términos</Link></nav>}
        </Container>
      </footer>
      </div>
    </MotionConfig>
  );
}
