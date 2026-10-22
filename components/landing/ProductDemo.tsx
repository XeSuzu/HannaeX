"use client";

import { useRef, useState, type KeyboardEvent } from "react";

const scenarios = ["Bienvenida", "Interacción", "Progreso"] as const;
type Scenario = (typeof scenarios)[number];

const scenarioCopy: Record<Scenario, { message: string; detail: string; accent: string }> = {
  Bienvenida: { message: "¡Bienvenida a la comunidad, Luna!", detail: "Hoshiko acompaña la llegada de nuevos miembros con un saludo configurado por el servidor.", accent: "Nuevo miembro" },
  Interacción: { message: "Hoshiko le dio un abrazo a Luna.", detail: "Las interacciones sociales incluyen comandos como /hug, /kiss, /pat y /highfive.", accent: "/hug usuario" },
  Progreso: { message: "Luna alcanzó el nivel 12.", detail: "La actividad de mensajes y voz puede alimentar el progreso cuando el sistema está configurado.", accent: "Nivel 12" },
};

export function ProductDemo() {
  const [active, setActive] = useState<Scenario>("Bienvenida");
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const copy = scenarioCopy[active];
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % scenarios.length : event.key === "ArrowLeft" ? (index - 1 + scenarios.length) % scenarios.length : event.key === "Home" ? 0 : event.key === "End" ? scenarios.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); setActive(scenarios[next]); refs.current[next]?.focus();
  }
  return <div className="product-demo" aria-label="Demostración de Hoshiko en Discord">
    <div className="demo-window-bar"><span /><span /><span /><small># bienvenida · Demostración · datos de ejemplo</small></div>
    <div className="demo-window-body"><aside className="demo-sidebar" aria-hidden="true"><b>H</b><span /><span /><span /><span /></aside><div className="demo-main">
      <div className="demo-channel"><strong># comunidad</strong><span>Demostración · datos de ejemplo</span></div>
      <div className="demo-tabs" role="tablist" aria-label="Escenarios de conversación">{scenarios.map((scenario, index) => <button key={scenario} ref={(element) => { refs.current[index] = element; }} type="button" role="tab" aria-selected={active === scenario} aria-controls="conversation-panel" tabIndex={active === scenario ? 0 : -1} onClick={() => setActive(scenario)} onKeyDown={(event) => onKeyDown(event, index)}>{scenario}</button>)}</div>
      <div className="demo-conversation" id="conversation-panel" role="tabpanel" aria-live="polite"><span className="demo-avatar">H</span><div className="demo-message-content"><div><b>Hoshiko</b><small> APP · hoy a las 20:14</small></div><p>{copy.message}</p><div className="demo-embed"><strong>{copy.accent}</strong><span>{copy.detail}</span></div></div></div>
      <div className="demo-disclaimer">No conecta con Discord. Esta ventana solo muestra una interacción de ejemplo.</div>
    </div></div>
  </div>;
}
