"use client";

import { useState } from "react";

const tabs = ["Moderación", "Interacción", "Progreso"] as const;
type Tab = (typeof tabs)[number];

export function ProductDemo() {
  const [activeTab, setActiveTab] = useState<Tab>("Moderación");

  return (
    <div className="product-demo" aria-label="Demostración ilustrativa de Hoshiko">
      <div className="demo-window-bar"><span /><span /><span /><small># comunidad-hoshiko</small></div>
      <div className="demo-window-body">
        <div className="demo-sidebar"><b>H</b><span /><span /><span /><span /></div>
        <div className="demo-main">
          <div className="demo-tabs" role="tablist" aria-label="Funciones de Hoshiko">
            {tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}
          </div>
          {activeTab === "Moderación" && <div className="demo-panel"><div className="demo-alert"><strong>Revisión sugerida</strong><span>Hoshiko detectó un mensaje que puede necesitar atención.</span><em>Revisar contexto</em></div><div className="demo-message"><b>luna.sakura</b><span>mensaje marcado para revisión</span><small>El staff mantiene la decisión final.</small></div><div className="demo-actions"><button type="button">Ver contexto</button><button type="button">Cerrar revisión</button></div></div>}
          {activeTab === "Interacción" && <div className="demo-panel"><div className="demo-chat"><span className="demo-avatar">H</span><div><b>Hoshiko</b><p>Estoy aquí para acompañar la conversación de la comunidad.</p></div></div><div className="demo-command"><span>/activity</span><small>Consulta una tarjeta de actividad y presencia.</small></div></div>}
          {activeTab === "Progreso" && <div className="demo-panel"><div className="demo-level"><div><span>Nivel de comunidad</span><strong>12</strong></div><div className="demo-progress"><i /></div><small>Progreso de participación · tarjeta ilustrativa</small></div></div>}
        </div>
      </div>
    </div>
  );
}
