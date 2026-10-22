"use client";

import { useState, type CSSProperties } from "react";

const palettes = [{ name: "Sakura", color: "#e59aae" }, { name: "Lavanda", color: "#9b91ca" }, { name: "Ciruela", color: "#71506f" }];
export function CustomizationDemo() {
  const [name, setName] = useState("Luna");
  const [palette, setPalette] = useState(0);
  return <div className="custom-demo">
    <div className="custom-controls"><label htmlFor="preview-name">Nombre de ejemplo<input id="preview-name" value={name} maxLength={18} onChange={(event) => setName(event.target.value)} /></label><fieldset><legend>Color de acento</legend><div className="palette-options">{palettes.map((item, index) => <button key={item.name} type="button" aria-label={`Usar acento ${item.name}`} aria-pressed={palette === index} style={{ "--swatch": item.color } as CSSProperties} onClick={() => setPalette(index)}><i />{item.name}</button>)}</div></fieldset></div>
    <div className="custom-preview" style={{ "--preview-accent": palettes[palette].color } as CSSProperties}><span className="custom-preview-label">Vista previa de ejemplo</span><div className="custom-welcome-card"><span className="custom-avatar">{name.slice(0, 1).toUpperCase() || "L"}</span><div><small>BIENVENIDA A LA COMUNIDAD</small><strong>Hola, {name || "amiga"}.</strong><p>Que encuentres un rinconcito bonito entre flores y estrellas.</p></div></div><small>No modifica tu servidor.</small></div>
  </div>;
}
