"use client";

import { useRef, useState, type KeyboardEvent } from "react";

const tabs = ["Moderación", "Interacción", "Progreso"] as const;
type Tab = (typeof tabs)[number];

export function ProductDemo() {
  const [activeTab, setActiveTab] = useState<Tab>("Moderación");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const nextIndex = event.key === "ArrowRight" || event.key === "ArrowDown" ? (index + 1) % tabs.length : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (index - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
    if (nextIndex === -1) return;
    event.preventDefault();
    setActiveTab(tabs[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section className="product-demo" aria-labelledby="demo-title">
      <h3 id="demo-title" className="sr-only">Demostración ilustrativa de Hoshiko</h3>
      <div className="demo-window-bar"><span /><span /><span /><small># comunidad-hoshiko</small></div>
      <div className="demo-window-body">
        <div className="demo-sidebar" aria-hidden="true"><b>H</b><span /><span /><span /><span /></div>
        <div className="demo-main">
          <div className="demo-tabs" role="tablist" aria-label="Funciones de Hoshiko">
            {tabs.map((tab, index) => <button key={tab} ref={(element) => { tabRefs.current[index] = element; }} type="button" role="tab" aria-selected={activeTab === tab} aria-controls="demo-panel" tabIndex={activeTab === tab ? 0 : -1} id={`demo-tab-${tab.toLowerCase()}`} onClick={() => setActiveTab(tab)} onKeyDown={(event) => handleTabKeyDown(event, index)}>{tab}</button>)}
          </div>
          <div className="demo-panel" id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${activeTab.toLowerCase()}`}>
            {activeTab === "Moderación" && <>
              <div className="demo-alert"><strong>Revisión sugerida</strong><span>Un mensaje puede necesitar atención del equipo.</span><em>Revisar contexto</em></div>
              <div className="demo-message"><b>miembro_de_ejemplo</b><span>Mensaje señalado para revisión</span><small>El staff mantiene la decisión final.</small></div>
              <div className="demo-actions"><span>Ver contexto</span><span>Resolver revisión</span></div>
            </>}
            {activeTab === "Interacción" && <>
              <div className="demo-chat"><span className="demo-avatar">H</span><div><b>Hoshiko</b><p>Una compañera digital para las conversaciones de tu comunidad.</p></div></div>
              <div className="demo-command"><span>Interacciones</span><small>Comandos y respuestas disponibles según la configuración del servidor.</small></div>
            </>}
            {activeTab === "Progreso" && <div className="demo-level"><div><span>Nivel de ejemplo</span><strong>12</strong></div><div className="demo-progress"><i /></div><small>Indicador visual ilustrativo, no datos reales de un servidor.</small></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
