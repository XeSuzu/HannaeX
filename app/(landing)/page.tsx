import Image from "next/image";
import { siteConfig } from "@/lib/config";
import { Container } from "@/components/layout/Container";
import { ProductDemo } from "@/components/landing/ProductDemo";

const inviteConfigured = siteConfig.inviteUrl !== "#invitar";

const features = [
  {
    number: "01",
    title: "Moderación asistida",
    text: "Detecta situaciones que merecen una revisión y ayuda al staff a decidir con más contexto.",
    icon: "/images/Shield1.jpg",
  },
  {
    number: "02",
    title: "Conversación con personalidad",
    text: "Interacciones pensadas para que Hoshiko se sienta parte de la comunidad, no otro comando sin alma.",
    icon: "/images/fox1.jpg",
  },
  {
    number: "03",
    title: "Niveles y progreso",
    text: "Reconoce la actividad de los miembros con un sistema de experiencia y niveles.",
    icon: "/images/Planet1.jpg",
  },
];

function Arrow() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-6 6 6-6 6" /></svg>;
}

function InviteLink({ secondary = false }: { secondary?: boolean }) {
  if (!inviteConfigured) {
    return <span className={secondary ? "invite-unavailable" : "button button-disabled"} aria-disabled="true">Invitación próximamente</span>;
  }

  return <a className={secondary ? "text-link" : "button"} href={siteConfig.inviteUrl}>Invitar a Hoshiko <span aria-hidden="true">↗</span></a>;
}

export default function LandingPage() {
  return (
    <main>
      <section id="inicio" className="hero">
        <div className="hero-media">
          <Image src="/images/hoshiko-banner.jpg" alt="Ilustración de Hoshiko entre flores de cerezo" fill priority sizes="100vw" />
        </div>
        <div className="hero-shade" aria-hidden="true" />
        <Container className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-mark">✳</span> HOSHIKO · BOT PARA DISCORD</p>
            <h1>Tu comunidad,<br /><em>con más cuidado.</em></h1>
            <p className="hero-description">Moderación asistida por IA, herramientas para tu staff e interacciones con personalidad. Todo en un mismo lugar.</p>
            <div className="hero-actions">
              <InviteLink />
              <a className="button button-secondary" href="#funciones">Conocer Hoshiko <span aria-hidden="true">↓</span></a>
            </div>
            <p className="hero-note"><span aria-hidden="true">✦</span> En desarrollo activo · Algunas funciones siguen en beta</p>
          </div>
        </Container>
        <span className="hero-side-note" aria-hidden="true">A LITTLE MORE HUMAN</span>
      </section>

      <section id="sobre-hoshiko" className="section section-paper">
        <Container>
          <div className="section-heading">
            <p className="section-label"><span>01</span> / QUÉ ES HOSHIKO</p>
            <h2>Herramientas útiles.<br /><em>Un poco de carácter.</em></h2>
            <p>Hoshiko reúne las herramientas que ayudan a cuidar un servidor y las pequeñas interacciones que hacen que la gente quiera quedarse.</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.number}>
                <div className="feature-topline"><span>{feature.number}</span><div className="feature-icon"><Image src={feature.icon} alt="" fill sizes="64px" /></div></div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="funciones" className="section section-demo">
        <Container>
          <div className="demo-intro">
            <div className="section-heading">
              <p className="section-label"><span>02</span> / EN CONTEXTO</p>
              <h2>Así se ve<br /><em>cuando ayuda.</em></h2>
            </div>
            <p>Una demostración ilustrativa de algunas ideas de interfaz. Las funciones disponibles pueden variar mientras Hoshiko continúa en beta.</p>
          </div>
          <ProductDemo />
          <p className="demo-caption"><span aria-hidden="true">✳</span> Vista conceptual, no una captura real de Discord.</p>
        </Container>
      </section>

      <section id="cuidar" className="section section-blue">
        <Container>
          <div className="care-grid">
            <div className="care-copy">
              <p className="section-label"><span>03</span> / MODERACIÓN</p>
              <h2>Más contexto.<br /><em>Mejores decisiones.</em></h2>
              <p>La moderación asistida ayuda a identificar mensajes que merecen atención. El equipo puede revisar el contexto y actuar según las herramientas disponibles.</p>
              <span className="care-principle"><span aria-hidden="true">✦</span> La IA apoya al equipo; no reemplaza su criterio.</span>
            </div>
            <ol className="moderation-flow" aria-label="Flujo ilustrativo de moderación">
              <li className="flow-step"><span className="flow-index">01</span><span><strong>Señalar</strong><small>Una situación requiere atención.</small></span><span className="flow-tag">Hoshiko</span></li>
              <li className="flow-connector" aria-hidden="true"><span /></li>
              <li className="flow-step"><span className="flow-index">02</span><span><strong>Revisar</strong><small>El staff valora el contexto.</small></span><span className="flow-tag">Staff</span></li>
              <li className="flow-connector" aria-hidden="true"><span /></li>
              <li className="flow-step"><span className="flow-index">03</span><span><strong>Actuar</strong><small>Según las herramientas configuradas.</small></span><span className="flow-tag flow-tag-gold">Decisión</span></li>
            </ol>
          </div>
        </Container>
      </section>

      <section id="retrato" className="section section-portrait">
        <Container>
          <div className="portrait-grid">
            <div className="portrait-copy">
              <p className="section-label"><span>04</span> / SU UNIVERSO</p>
              <h2>Un bot con<br /><em>su propia voz.</em></h2>
              <p>Hoshiko también está hecha para los momentos cotidianos: conversar, compartir pequeñas interacciones y darle un toque propio al servidor.</p>
              <a className="text-link" href="#invitar">Conocer Hoshiko <Arrow /></a>
            </div>
            <figure className="portrait-figure">
              <div className="portrait-media"><Image src="/images/fox1.jpg" alt="Ilustración del universo visual de Hoshiko" fill sizes="(min-width: 1024px) 42vw, 100vw" /></div>
              <figcaption><span>HOSHIKO'S REALM</span><span>01 — SAKURA NOTES</span></figcaption>
            </figure>
          </div>
        </Container>
      </section>

      <section id="invitar" className="section section-invite">
        <Container>
          <div className="invite-panel">
            <div className="invite-copy">
              <p className="section-label"><span>05</span> / EL SIGUIENTE PASO</p>
              <h2>Tu servidor también<br /><em>puede tenerla.</em></h2>
              <p>Conoce Hoshiko y descubre si encaja con la comunidad que estás construyendo.</p>
              <InviteLink />
            </div>
            <div className="invite-art"><Image src="/images/foxes1.jpg" alt="" fill sizes="(min-width: 768px) 280px, 180px" /></div>
            <span className="invite-decoration" aria-hidden="true">✳</span>
          </div>
        </Container>
      </section>
    </main>
  );
}
