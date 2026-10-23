"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";

const scenarios = ["Bienvenida", "Interacción", "Progreso"] as const;
type Scenario = (typeof scenarios)[number];
const scenarioCopy: Record<Scenario, { message: string; detail: string; accent: string }> = {
  Bienvenida: { message: "¡Bienvenida a la comunidad, Luna!", detail: "Hoshiko acompaña la llegada de nuevos miembros con un saludo configurado por el servidor.", accent: "Nuevo miembro" },
  Interacción: { message: "Hoshiko le dio un abrazo a Luna.", detail: "Las interacciones sociales incluyen comandos como /hug, /kiss, /pat y /highfive.", accent: "/hug usuario" },
  Progreso: { message: "Luna alcanzó el nivel 12.", detail: "La actividad de mensajes y voz puede alimentar el progreso cuando el sistema está configurado.", accent: "Nivel 12" },
};

function ConversationPanel({ active }: { active: Scenario }) {
  const copy = scenarioCopy[active];
  return <div className="demo-conversation" role="tabpanel" aria-live="polite"><span className="demo-avatar">H</span><div className="demo-message-content"><div><b>Hoshiko</b><small> APP · hoy a las 20:14</small></div><p>{copy.message}</p><div className="demo-embed"><strong>{copy.accent}</strong><span>{copy.detail}</span></div></div></div>;
}

export function ProductDemo() {
  const [active, setActive] = useState<Scenario>("Bienvenida");
  const [open, setOpen] = useState(false);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % scenarios.length : event.key === "ArrowLeft" ? (index - 1 + scenarios.length) % scenarios.length : event.key === "Home" ? 0 : event.key === "End" ? scenarios.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); setActive(scenarios[next]); refs.current[next]?.focus();
  }
  return <div className="product-demo" aria-label="Demostración de Hoshiko en Discord">
    <div className="demo-window-bar"><span /><span /><span /><small># bienvenida · Vista de muestra</small></div>
    <div className="demo-window-body"><aside className="demo-sidebar" aria-hidden="true"><b>H</b><span /><span /><span /><span /></aside><div className="demo-main">
      <div className="demo-channel"><strong># comunidad</strong><span>Vista de muestra</span></div>
      <div className="demo-tabs" role="tablist" aria-label="Escenarios de conversación">{scenarios.map((scenario, index) => <button key={scenario} ref={(element) => { refs.current[index] = element; }} type="button" role="tab" aria-selected={active === scenario} aria-controls="conversation-panel" tabIndex={active === scenario ? 0 : -1} onClick={() => setActive(scenario)} onKeyDown={(event) => onKeyDown(event, index)}>{scenario}</button>)}</div>
      <ConversationPanel active={active} />
      <div className="demo-disclaimer">Una vista de muestra para imaginar cómo acompaña Hoshiko a tu comunidad.</div>
      <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger className="demo-expand" type="button">Ampliar demo <span aria-hidden="true">↗</span></Dialog.Trigger><Dialog.Portal><Dialog.Backdrop className="dialog-backdrop" /><Dialog.Popup className="demo-dialog"><Dialog.Title className="dialog-title">Hoshiko en tu servidor</Dialog.Title><Dialog.Description className="dialog-description">Escenario seleccionado: {active}. Una recreación ilustrativa del escenario seleccionado.</Dialog.Description><div className="demo-dialog-window"><div className="demo-window-bar"><span /><span /><span /><small># comunidad · {active}</small></div><ConversationPanel active={active} /></div><Dialog.Close className="dialog-close" type="button">Cerrar</Dialog.Close></Dialog.Popup></Dialog.Portal></Dialog.Root>
    </div></div>
  </div>;
}
