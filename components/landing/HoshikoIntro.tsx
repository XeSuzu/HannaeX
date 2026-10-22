"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const INTRO_KEY = "hoshiko-intro-seen";

export function HoshikoIntro() {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const skip = window.location.hash || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = sessionStorage.getItem(INTRO_KEY) === "1"; } catch { /* storage can be unavailable */ }
    if (skip || seen) { setReady(true); return; }
    setVisible(true); setReady(true);
    const timer = window.setTimeout(() => dismiss(), 1850);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    dismissRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible]);

  function dismiss() {
    try { sessionStorage.setItem(INTRO_KEY, "1"); } catch { /* continue without persistence */ }
    setVisible(false);
  }

  if (!ready || !visible) return null;
  return <div className="hoshiko-intro" role="dialog" aria-modal="true" aria-label="Introducción de Hoshiko">
    <motion.div className="intro-orbit" aria-hidden="true" animate={reducedMotion ? undefined : { rotate: 360 }} transition={{ duration: 8, ease: "linear", repeat: Infinity }} />
    <motion.p className="intro-name" initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>Hoshiko</motion.p>
    <p className="intro-tagline">Un pequeño universo para tu comunidad.</p>
    <button ref={dismissRef} className="intro-skip" type="button" onClick={dismiss}>Saltar intro</button>
    <span className="intro-petal" aria-hidden="true">✦</span>
  </div>;
}
