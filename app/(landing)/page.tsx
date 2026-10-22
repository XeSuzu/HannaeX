import Image from "next/image";
import { siteConfig } from "@/lib/config";
import { Container } from "@/components/layout/Container";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { LevelDemo } from "@/components/landing/LevelDemo";
import { CustomizationDemo } from "@/components/landing/CustomizationDemo";
import { ModerationDemo } from "@/components/landing/ModerationDemo";
import { ShortcutGrid } from "@/components/landing/ShortcutGrid";
import { FadeIn } from "@/components/landing/FadeIn";
import { SakuraPetals } from "@/components/landing/SakuraPetals";

const inviteConfigured = siteConfig.inviteUrl !== "#invitar";
const shortcuts = [
  { href: "#conversar", title: "Conversar", image: "/images/fox1.jpg", alt: "Ilustración kitsune" },
  { href: "#progresar", title: "Progresar", image: "/images/Planet1.jpg", alt: "Planeta ilustrado" },
  { href: "#cuidar", title: "Cuidar", image: "/images/Shield1.jpg", alt: "Emblema ilustrado" },
  { href: "#personalizar", title: "Personalizar", image: "/images/foxes1.jpg", alt: "Dos kitsunes juntos" },
];
const catalog = [
  ["Interacciones", "Comandos sociales como /hug, /kiss, /pat y /highfive."],
  ["XP por mensajes", "Progreso por actividad con cooldown, mínimo de caracteres y configuración del servidor."],
  ["XP por voz", "Seguimiento de tiempo en canales de voz cuando el staff lo activa."],
  ["Clasificaciones", "/rank, /top, /leaderboard y opciones globales o semanales."],
  ["Moderación", "Advertencias, mute temporal, casos, filtros de palabras y whitelist."],
  ["Comunidad", "Confesiones, sugerencias, rachas y roles automáticos de entrada."],
];
function InviteLink({ className = "sakura-button", children = "Invitar a Hoshiko" }: { className?: string; children?: React.ReactNode }) { if (!inviteConfigured) return <span className={`${className} is-disabled`} aria-disabled="true">Invitación próximamente</span>; return <a className={className} href={siteConfig.inviteUrl}>{children}<span aria-hidden="true"> ✦</span></a>; }

export default function LandingPage() {
  return <main id="contenido" className="hoshiko-home">
    <section id="inicio" className="sakura-hero hero-scene"><div className="hero-art"><div className="hero-art-frame"><Image src="/images/hoshiko-banner.jpg" alt="Hoshiko entre flores de cerezo" fill priority sizes="(max-width: 767px) 100vw, 58vw" /></div></div><div className="hero-wash" aria-hidden="true" /><SakuraPetals /><Container className="hero-inner"><div className="hero-copy"><h1 translate="no">HOSHIKO</h1><h2>Tu compañera<br />cósmica de cerezo</h2><p>Una kitsune dulce para conversar, progresar y cuidar los pequeños momentos de tu comunidad.</p><a className="sakura-button" href="#conversar">Descubrir cómo acompaña <span aria-hidden="true">✦</span></a></div></Container></section>
    <section className="shortcut-section" aria-label="Descubre lo que hace Hoshiko"><Container className="shortcut-grid-wrap"><ShortcutGrid items={shortcuts} /></Container></section>

    <section id="conversar" className="product-section product-cream"><Container><FadeIn className="product-intro"><div><p className="section-kicker">✿ HOSHIKO EN TU SERVIDOR ✿</p><h2>Pequeños momentos.<br /><em>Una comunidad más cercana.</em></h2><p>Hoshiko acompaña la convivencia con saludos, interacciones y respuestas que conservan su propia personalidad.</p></div><span className="product-note">Demostración local<br />datos de ejemplo</span></FadeIn><ProductDemo /></Container></section>

    <section id="progresar" className="product-section product-pink"><Container><div className="split-heading"><div><p className="section-kicker">✧ PROGRESO Y NIVELES ✧</p><h2>Cada conversación deja<br /><em>una pequeña huella.</em></h2></div><p>El bot soporta XP por mensajes y voz, niveles, rangos y clasificaciones configurables por servidor.</p></div><LevelDemo /></Container></section>

    <section id="cuidar" className="product-section product-night"><Container><div className="moderation-layout product-moderation-copy"><div><p className="section-kicker">✧ CUIDAR LA COMUNIDAD ✧</p><h2>Más contexto<br /><em>para cuidar mejor.</em></h2><p>La moderación asistida puede señalar situaciones y guardar contexto. El staff conserva la decisión final; esta vista no ejecuta acciones reales.</p><a className="soft-link light-link" href="#catalogo">Ver herramientas disponibles <span aria-hidden="true">↗</span></a></div><ModerationDemo /></div></Container></section>

    <section id="personalizar" className="product-section product-cream"><Container><div className="split-heading"><div><p className="section-kicker">✿ PERSONALIZACIÓN ✿</p><h2>Su mundo, con el estilo<br /><em>de tu comunidad.</em></h2></div><p>Configura mensajes, roles y sistemas del servidor sin perder la identidad cálida de Hoshiko.</p></div><CustomizationDemo /></Container></section>

    <section id="catalogo" className="catalog-section"><Container><FadeIn className="center-heading"><p className="section-kicker">✧ UN MAPA PEQUEÑO DE SUS FUNCIONES ✧</p><h2>Todo lo que puede <em>acompañar.</em></h2><p>Capacidades verificadas en el repositorio; los detalles dependen de la configuración de cada servidor.</p></FadeIn><div className="catalog-grid">{catalog.map(([title, text], index) => <article key={title} className="catalog-item"><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></Container></section>

    <section id="comunidad" className="community-section"><Container><div className="community-panel"><div className="community-copy"><p className="section-kicker">✿ TU AVENTURA COMIENZA AQUÍ ✿</p><h2>Un lugarcito para <em>Hoshiko.</em></h2><p>Explora el proyecto y descubre si encaja con el ritmo de tu servidor.</p><InviteLink /></div><div className="community-art"><Image src="/images/foxes1.jpg" alt="Ilustración del mundo de Hoshiko" fill sizes="(min-width: 768px) 28vw, 70vw" /></div></div></Container></section>
  </main>;
}
