"use client";

import { useState } from "react";

const examples = [
  { label: "Cuando la llamas", user: "@Hoshiko ¿qué puedo hacer aquí?", reply: "¡Te cuento! Puedo enseñarte algunos comandos para empezar~", tone: "reply" },
  { label: "Sigues la charla", user: "¿Y recuerdas cómo me gusta que me llamen?", reply: "Sí, puedo tenerlo en cuenta para que la conversación se sienta más tuya.", tone: "reply" },
  { label: "La charla sigue", user: "alguien: mañana jugamos a las 8", reply: "Hoshiko deja que el momento sea de ustedes.", tone: "quiet" },
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
    <p className="context-note">Una compañía que aparece cuando la necesitas y sabe cuándo dejar espacio.</p>
  </div>;
}
