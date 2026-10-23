"use client";

import { useState } from "react";

export function ModerationDemo() {
  const [contextOpen, setContextOpen] = useState(false);
  const [resolved, setResolved] = useState(false);
  return <div className={`moderation-demo ${resolved ? "is-resolved" : ""}`}><div className="mod-demo-header"><span>CUIDAR LA COMUNIDAD</span><small>Así podría verse una revisión</small></div><div className="mod-alert"><span className="mod-status" aria-hidden="true" /> <div><strong>{resolved ? "Revisión marcada como atendida" : "Revisión sugerida"}</strong><p>{resolved ? "El staff decidió cerrar este ejemplo." : "Un mensaje puede necesitar atención del equipo."}</p></div></div><div className="mod-message"><div className="mod-avatar">M</div><div><strong>miembro_de_ejemplo <small>hoy a las 20:18</small></strong><p>Un mensaje que el filtro configurado ha pedido revisar.</p></div></div>{contextOpen && <div className="mod-context" role="status"><strong>Contexto disponible</strong><span>Historial reciente y regla activada: wordfilter.</span><small>La decisión sigue en manos del staff.</small></div>}<div className="mod-actions"><button type="button" onClick={() => setContextOpen((open) => !open)}>{contextOpen ? "Ocultar contexto" : "Ver contexto"}</button><button type="button" onClick={() => setResolved(true)} disabled={resolved}>{resolved ? "Atendido" : "Marcar atendido"}</button></div></div>;
}
