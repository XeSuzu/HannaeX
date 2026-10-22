"use client";

import { useState } from "react";

const profiles = [{ name: "Luna", level: 12, xp: 1840, next: 2200, avatar: "L" }, { name: "Mika", level: 8, xp: 940, next: 1200, avatar: "M" }];
export function LevelDemo() {
  const [profile, setProfile] = useState(0);
  const [leveled, setLeveled] = useState(false);
  const current = profiles[profile];
  const level = leveled ? current.level + 1 : current.level;
  const xp = leveled ? 120 : current.xp;
  const next = leveled ? 600 : current.next;
  return <div className="level-demo">
    <div className="level-profile-picker" role="tablist" aria-label="Perfiles de ejemplo">{profiles.map((item, index) => <button key={item.name} type="button" role="tab" aria-selected={profile === index} onClick={() => { setProfile(index); setLeveled(false); }}>{item.name}</button>)}</div>
    <div className="rank-card"><div className="rank-avatar">{current.avatar}</div><div className="rank-heading"><span>Perfil de ejemplo</span><strong>{current.name}</strong><small>Nivel {level}</small></div><div className="rank-value"><strong>{xp.toLocaleString()}</strong><span>/ {next.toLocaleString()} XP</span></div><div className="rank-bar"><i style={{ width: `${Math.min(100, (xp / next) * 100)}%` }} /></div><div className="rank-meta"><span>XP por mensajes</span><span>Servidor de ejemplo</span></div></div>
    <button className="sakura-button level-action" type="button" onClick={() => setLeveled(true)} disabled={leveled}>{leveled ? "Subida mostrada" : "Ver subida de nivel"}</button>
    {leveled && <p className="level-feedback" role="status">Nivel actualizado de forma ilustrativa. No modifica ningún perfil real.</p>}
    <div className="leaderboard-demo"><div><strong>Clasificación de ejemplo</strong><span>No es información en tiempo real</span></div><ol><li><b>1</b> Aiko <span>Nivel 18</span></li><li><b>2</b> {current.name} <span>Nivel {level}</span></li><li><b>3</b> Ren <span>Nivel 7</span></li></ol></div>
  </div>;
}
