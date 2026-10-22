import Image from "next/image";
import { siteConfig } from "@/lib/config";
import { Container } from "@/components/layout/Container";
import { ProductDemo } from "@/components/landing/ProductDemo";

const inviteConfigured = siteConfig.inviteUrl !== "#invitar";

const shortcuts = [
  { href: "#sobre-hoshiko", title: "Conocer a Hoshiko", image: "/images/fox1.jpg", alt: "Ilustración kitsune" },
  { href: "#galeria", title: "Ver su universo", image: "/images/foxes1.jpg", alt: "Ilustración del universo de Hoshiko" },
  { href: "#funciones", title: "Descubrir funciones", image: "/images/Planet1.jpg", alt: "Planeta ilustrado" },
  { href: "#comunidad", title: "Unirse a la comunidad", image: "/images/Shield1.jpg", alt: "Emblema ilustrado" },
];

const features = [
  { title: "Una compañera con personalidad", text: "Interacciones y respuestas con una identidad propia, pensadas para convivir con la comunidad.", image: "/images/fox1.jpg" },
  { title: "Moderación que ayuda", text: "Herramientas asistidas por IA para señalar situaciones que merecen atención y dar más contexto al staff.", image: "/images/Shield1.jpg" },
  { title: "Actividad y progreso", text: "Funciones para acompañar la actividad de la comunidad con niveles y pequeñas recompensas.", image: "/images/Planet1.jpg" },
];

function InviteLink({ className = "sakura-button", children = "Invitar a Hoshiko" }: { className?: string; children?: React.ReactNode }) {
  if (!inviteConfigured) return <span className={`${className} is-disabled`} aria-disabled="true">Invitación próximamente</span>;
  return <a className={className} href={siteConfig.inviteUrl}>{children}<span aria-hidden="true"> ✦</span></a>;
}

export default function LandingPage() {
  return (
    <main id="contenido" className="hoshiko-home">
      <section id="inicio" className="sakura-hero hero-scene">
        <div className="hero-art"><div className="hero-atmosphere" aria-hidden="true"><span className="atmosphere-orb orb-pink" /><span className="atmosphere-orb orb-lavender" /><span className="atmosphere-glow" /></div><div className="hero-art-frame"><Image src="/images/hoshiko-banner.jpg" alt="Hoshiko entre flores de cerezo" fill priority sizes="(max-width: 767px) 100vw, 58vw" /></div></div>
        <div className="hero-wash" aria-hidden="true" />
        <Container className="hero-inner">
          <div className="hero-copy">
            <h1 translate="no">HOSHIKO</h1>
            <h2>Tu compañera<br />cósmica de cerezo</h2>
            <p>Descubre su mundo lleno de flores y estrellas. Una kitsune dulce con un toque de magia cósmica.</p>
            <a className="sakura-button" href="#sobre-hoshiko">Explorar su mundo <span aria-hidden="true">✦</span></a>
          </div>
        </Container>
      </section>

      <section className="shortcut-section" aria-label="Explora el mundo de Hoshiko">
        <Container className="shortcut-grid">
          {shortcuts.map((item) => (
            <a className="shortcut-card" href={item.href} key={item.title}>
              <span className="shortcut-image"><Image src={item.image} alt={item.alt} fill sizes="76px" /></span>
              <span>{item.title}</span>
            </a>
          ))}
        </Container>
      </section>

      <section id="sobre-hoshiko" className="world-section world-cream">
        <Container>
          <div className="center-heading">
            <p className="section-kicker">✿ UN GUSTO EN CONOCERTE ✿</p>
            <h2>Un poquito sobre <em>Hoshiko</em></h2>
            <p>Más que un conjunto de comandos, Hoshiko quiere ser parte de esos pequeños momentos que hacen especial a una comunidad.</p>
          </div>
          <div className="intro-grid">
            <div className="intro-art"><Image src="/images/fox1.jpg" alt="Ilustración kitsune de Hoshiko" fill sizes="(min-width: 768px) 38vw, 90vw" /></div>
            <div className="intro-copy">
              <span className="decorative-star" aria-hidden="true">✧</span>
              <h3>Flores, estrellas<br />y buena compañía.</h3>
              <p>Hoshiko combina herramientas para cuidar tu servidor con una personalidad cálida y un pequeño universo visual propio. Está en desarrollo activo, así que algunas funciones siguen en beta y continúan mejorando.</p>
              <a className="soft-link" href="#funciones">Conoce lo que puede hacer <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </Container>
      </section>

      <section id="funciones" className="world-section world-pink">
        <Container>
          <div className="center-heading">
            <p className="section-kicker">✧ PEQUEÑAS COSAS, GRANDES MOMENTOS ✧</p>
            <h2>¿Qué encontrarás en <em>su mundo?</em></h2>
            <p>Un conjunto de herramientas para acompañar a tu comunidad sin perder el encanto de Hoshiko.</p>
          </div>
          <div className="world-card-grid">
            {features.map((feature, index) => (
              <article className="world-card glow-card" key={feature.title}>
                <div className="world-card-art"><Image src={feature.image} alt="" fill sizes="(min-width: 768px) 28vw, 80vw" /></div>
                <span className="world-card-number">✦ 0{index + 1}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="galeria" className="world-section world-cream">
        <Container>
          <div className="center-heading">
            <p className="section-kicker">✿ UN RINCÓN DE SU UNIVERSO ✿</p>
            <h2>Pequeña galería <em>de arte</em></h2>
            <p>Un espacio para la estética, las ilustraciones y los detalles que dan personalidad al mundo de Hoshiko.</p>
          </div>
          <div className="gallery-grid gallery-mosaic">
            <figure className="gallery-large"><Image src="/images/hoshiko-banner.jpg" alt="Arte principal de Hoshiko" fill sizes="(min-width: 768px) 60vw, 100vw" /><figcaption>SAKURA DREAMS · 01 — Arte principal de Hoshiko</figcaption></figure>
            <div className="gallery-stack"><figure><Image src="/images/foxes1.jpg" alt="Ilustración del universo de Hoshiko" fill sizes="(min-width: 768px) 30vw, 100vw" /><figcaption>STARLIGHT · 02 — Ilustración del universo de Hoshiko</figcaption></figure><aside className="gallery-note"><span>HOSHIKO / FIELD NOTES</span><strong>Una pequeña<br /><em>constelación</em><br />para tu comunidad.</strong><p>Arte, presencia y detalles que hacen que un servidor se sienta propio.</p></aside></div>
          </div>
        </Container>
      </section>

      <section id="moderacion" className="world-section world-blue">
        <Container>
          <div className="moderation-layout">
            <div className="moderation-copy"><p className="section-kicker">✧ CUIDAR TAMBIÉN ES ACOMPAÑAR ✧</p><h2>La tecnología ayuda.<br /><em>La comunidad importa.</em></h2><p>La moderación asistida por IA puede ayudar a detectar situaciones que merecen una revisión. Hoshiko suma contexto al trabajo del staff, sin reemplazar su criterio.</p><a className="soft-link" href="#funciones">Explorar sus funciones <span aria-hidden="true">↗</span></a></div>
            <div className="moderation-product"><span className="product-caption">HOSHIKO / MODERATION LAB</span><ProductDemo /></div>
          </div>
        </Container>
      </section>

      <section id="comunidad" className="community-section">
        <Container>
          <div className="community-panel">
            <div className="community-copy"><p className="section-kicker">✿ TU AVENTURA COMIENZA AQUÍ ✿</p><h2>Un lugarcito para <em>Hoshiko</em></h2><p>Conoce el proyecto, explora sus funciones y descubre si encaja con tu servidor de Discord.</p><InviteLink /></div>
            <div className="community-art"><Image src="/images/foxes1.jpg" alt="Ilustración del mundo de Hoshiko" fill sizes="(min-width: 768px) 28vw, 70vw" /></div>
            <span className="community-sparkle" aria-hidden="true">✧</span>
          </div>
        </Container>
      </section>
    </main>
  );
}
