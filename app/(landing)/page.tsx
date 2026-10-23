import Image from "next/image";
import { siteConfig } from "@/lib/config";
import { Container } from "@/components/layout/Container";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { LevelDemo } from "@/components/landing/LevelDemo";
import { CustomizationDemo } from "@/components/landing/CustomizationDemo";
import { ModerationDemo } from "@/components/landing/ModerationDemo";
import { Aurora } from "@/components/landing/Aurora";
import { BorderBeam } from "@/components/landing/BorderBeam";
import { StartSteps } from "@/components/landing/StartSteps";
import { FAQ } from "@/components/landing/FAQ";
import { ShortcutGrid } from "@/components/landing/ShortcutGrid";
import { FadeIn } from "@/components/landing/FadeIn";
import { SakuraPetals } from "@/components/landing/SakuraPetals";
import { ContextDemo } from "@/components/landing/ContextDemo";

const inviteConfigured = siteConfig.inviteUrl !== "#invitar";
const shortcuts = [
  { href: "#conversar", title: "Conversar", image: "/images/fox1.jpg", alt: "Ilustración kitsune" },
  { href: "#progresar", title: "Progresar", image: "/images/Planet1.jpg", alt: "Planeta ilustrado" },
  { href: "#cuidar", title: "Cuidar", image: "/images/Shield1.jpg", alt: "Emblema ilustrado" },
  { href: "#personalizar", title: "Personalizar", image: "/images/foxes1.jpg", alt: "Dos kitsunes juntos" },
];
const catalog = [
  ["Interacciones", "Comandos sociales como /hug, /kiss, /pat y /highfive."],
  ["XP por mensajes", "Cada conversación puede sumar un poquito de progreso a tu camino."],
  ["XP por voz", "También puedes progresar mientras compartes tiempo en canales de voz."],
  ["Clasificaciones", "/rank, /top, /leaderboard y opciones globales o semanales."],
  ["Moderación", "Advertencias, mute temporal, casos, filtros de palabras y whitelist."],
  ["Comunidad", "Confesiones, sugerencias, rachas y roles automáticos de entrada."],
  ["Una conversación con memoria", "Puede recordar ciertos detalles y responder de forma más cercana cuando vuelves a hablar con ella."],
  ["Para quienes cuidan el servidor", "Herramientas para organizar canales, roles y el ritmo de cada comunidad."],
];
function InviteLink({ className = "sakura-button", children = "Invitar a Hoshiko" }: { className?: string; children?: React.ReactNode }) { if (!inviteConfigured) return <span className={`${className} is-disabled`} aria-disabled="true">Invitación próximamente</span>; return <a className={className} href={siteConfig.inviteUrl}>{children}<span aria-hidden="true"> ✦</span></a>; }

export default function LandingPage() {
  return <main id="contenido" className="hoshiko-home">
    <section id="inicio" className="sakura-hero hero-scene"><div className="hero-art"><div className="hero-art-frame"><Image src="/images/hoshiko-banner.jpg" alt="Hoshiko entre flores de cerezo" fill priority sizes="(max-width: 767px) 100vw, 58vw" /></div></div><div className="hero-wash" aria-hidden="true" /><SakuraPetals /><Container className="hero-inner"><div className="hero-copy"><h1 translate="no">HOSHIKO</h1><h2>Tu compañera<br />cósmica de cerezo</h2><p>Una kitsune dulce para conversar, progresar y cuidar los pequeños momentos de tu comunidad.</p><div className="hero-actions"><InviteLink /><a className="text-link" href="#catalogo">Ver comandos y funciones <span aria-hidden="true">↗</span></a></div></div></Container></section>
    <section className="shortcut-section constellation-strip" aria-label="Descubre lo que hace Hoshiko"><Container className="shortcut-grid-wrap"><ShortcutGrid items={shortcuts} /></Container></section>

    <section id="conversar" className="product-section product-cream product-conversation feature-stage feature-stage-conversation"><Container><FadeIn className="product-intro"><div><p className="section-kicker">✿ HOSHIKO EN TU SERVIDOR ✿</p><h2>Pequeños momentos.<br /><em>Una comunidad más cercana.</em></h2><p>Hoshiko acompaña la convivencia con saludos, interacciones y respuestas que conservan su propia personalidad.</p></div><span className="product-note">Vista de muestra<br />así podría verse</span></FadeIn><ProductDemo /></Container></section>

    <section className="context-section feature-stage feature-stage-context"><Container><div className="context-heading"><div><p className="section-kicker">✧ IA CON CONTEXTO ✧</p><h2>También sabe cuándo<br /><em>dejar espacio.</em></h2></div><p>Habla con Hoshiko cuando necesites una mano. Y cuando la conversación no la necesita, sabe dejarla fluir.</p></div><ContextDemo /></Container></section>

    <section id="progresar" className="product-section product-pink product-progress feature-stage feature-stage-progress"><Container><div className="split-heading"><div><p className="section-kicker">✧ PROGRESO Y NIVELES ✧</p><h2>Cada conversación deja<br /><em>una pequeña huella.</em></h2></div><p>El bot soporta XP por mensajes y voz, niveles, rangos y clasificaciones configurables por servidor.</p></div><div className="rank-beam-wrap"><LevelDemo /><BorderBeam /></div></Container></section>

    <section id="cuidar" className="product-section product-night product-moderation feature-stage feature-stage-moderation"><Container><div className="moderation-layout product-moderation-copy"><div><p className="section-kicker">✧ CUIDAR LA COMUNIDAD ✧</p><h2>Más contexto<br /><em>para cuidar mejor.</em></h2><p>Ayuda a mantener el ambiente cuidado con alertas claras, herramientas de moderación y un poco de contexto cuando hace falta. El equipo siempre tiene la última palabra.</p><a className="soft-link light-link" href="#catalogo">Ver herramientas disponibles <span aria-hidden="true">↗</span></a></div><ModerationDemo /></div></Container></section>

    <section id="personalizar" className="product-section product-cream product-custom feature-stage feature-stage-custom"><Container><div className="split-heading"><div><p className="section-kicker">✿ PERSONALIZACIÓN ✿</p><h2>Su mundo, con el estilo<br /><em>de tu comunidad.</em></h2></div><p>Haz que Hoshiko se sienta como parte de tu servidor: elige sus mensajes, sus roles y la forma en que acompaña a la comunidad.</p></div><CustomizationDemo /></Container></section>

    <section className="journey-section feature-stage feature-stage-journey"><Aurora /><Container><div className="journey-heading"><div><p className="section-kicker">✧ ASÍ EMPIEZAS CON HOSHIKO ✧</p><h2>Una entrada sencilla<br /><em>al jardín nocturno.</em></h2></div><p>Cuando llegue la invitación, tendrás un camino sencillo para darle a Hoshiko su lugar en la comunidad.</p></div><StartSteps /></Container></section>

    <section id="catalogo" className="catalog-section feature-stage feature-stage-catalog"><Container><FadeIn className="center-heading"><p className="section-kicker">✧ UN MAPA PEQUEÑO DE SUS FUNCIONES ✧</p><h2>Todo lo que puede <em>acompañar.</em></h2><p>Descubre las funciones de Hoshiko; los detalles, permisos y canales pueden adaptarse a cada servidor.</p></FadeIn><div className="catalog-grid">{catalog.map(([title, text], index) => <article key={title} className="catalog-item"><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></Container></section>

    <section className="faq-section feature-stage feature-stage-faq"><Container><div className="faq-heading"><p className="section-kicker">✿ PREGUNTAS FRECUENTES ✿</p><h2>Lo esencial, <em>sin ruido.</em></h2><p>Respuestas concretas sobre lo que Hoshiko puede hacer, cómo cuidarla y cuándo estará disponible.</p></div><FAQ /></Container></section>

      <section id="comunidad" className="community-section"><Container><div className="community-panel"><div className="community-copy"><p className="section-kicker">✿ TU AVENTURA COMIENZA AQUÍ ✿</p><h2>Un lugarcito para <em>Hoshiko.</em></h2><p>Explora el proyecto, revisa los comandos disponibles y descubre si encaja con el ritmo de tu servidor. La invitación se habilitará cuando exista una URL operativa.</p><InviteLink /></div><div className="community-art"><Image src="/images/foxes1.jpg" alt="Ilustración del mundo de Hoshiko" fill sizes="(min-width: 768px) 28vw, 70vw" /></div></div></Container></section>
  </main>;
}
