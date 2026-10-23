"use client";

import { useState } from "react";

const examples = [
  { label: "Mención directa", user: "@Hoshiko ¿qué puedo hacer aquí?", reply: "¡Te cuento! Puedes usar /help para descubrir los comandos disponibles~", tone: "reply" },
  { label: "Reply a Hoshiko", user: "¿Y recuerdas cómo me gusta que me llamen?", reply: "Sí, puedo conservar preferencias cuando la conversación lo permite.", tone: "reply" },
  { label: "Conversación ajena", user: "alguien: mañana jugamos a las 8", reply: "Hoshiko observa en silencio · sin mención ni reply", tone: "quiet" },
];

export function ContextDemo() {
  const [active, setActive] = useState(0);
  const example = examples[active];
  return <div className="context-demo">
    <div className="context-tabs" role="tablist" aria-label="Ejemplos de respuesta contextual">
      {examples.map((item, index) => <button key={item.label} type="button" role="tab" aria-selected={active === index} className={active === index ? "is-active" : ""} onClick={() => setActive(index)}>{item.label}</button>)}
    </div>
    <div className={`context-thread ${example.tone === "quiet" ? "is-quiet" : ""}`}>
      <div className="context-message"><span className="context-avatar">A</span><div><b>Aster <small>hoy a las 20:14</small></b><p>{example.user}</p></div></div>
      <div className="context-rule" aria-hidden="true" />
      <div className="context-message hoshiko-message"><span className="context-avatar hoshiko-avatar">H</span><div><b>Hoshiko <small>asistente</small></b><p>{example.reply}</p></div></div>
    </div>
    <p className="context-note">La respuesta depende de la mención, el reply y el contexto disponible. No es un chat autónomo permanente.</p>
  </div>;
}
