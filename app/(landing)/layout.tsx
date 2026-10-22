import Link from "next/link";
import { SHOW_LEGAL_LINKS, siteConfig } from "@/lib/config";
import { Container } from "@/components/layout/Container";

export default function LandingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="site-shell"><header className="site-header"><Container className="nav-inner"><Link className="brand" href="#inicio" aria-label="Hoshiko, volver al inicio"><span className="brand-mark" aria-hidden="true">H</span><span><strong>Hoshiko</strong><small>TU COMPAÑERA CÓSMICA</small></span></Link><nav aria-label="Navegación principal"><Link href="#sobre-hoshiko">Sobre Hoshiko</Link><Link href="#retrato">Un retrato</Link><Link href="#cuidar">Cuidar la comunidad</Link><Link href="#invitar">Invitar</Link></nav><a className="button button-small" href={siteConfig.inviteUrl}>Invitar a Hoshiko <span aria-hidden="true">↗</span></a></Container></header>{children}<footer className="site-footer"><Container className="footer-inner"><span>© Hoshiko&apos;s Realm</span><span>Hecha de cerezo, estrellas y un poquito de magia.</span>{SHOW_LEGAL_LINKS && <nav aria-label="Información legal"><Link href={siteConfig.privacyPath}>Privacidad</Link><Link href={siteConfig.termsPath}>Términos</Link></nav>}</Container></footer></div>;
}
