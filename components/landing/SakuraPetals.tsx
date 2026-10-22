"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

const petals = [
  ["14%", "18px", "19s", "-8s", "12deg"], ["25%", "12px", "23s", "-15s", "-20deg"],
  ["38%", "22px", "26s", "-20s", "32deg"], ["51%", "14px", "21s", "-4s", "-12deg"],
  ["63%", "19px", "28s", "-17s", "24deg"], ["74%", "11px", "24s", "-11s", "-28deg"],
  ["83%", "16px", "22s", "-22s", "18deg"], ["91%", "13px", "27s", "-7s", "-18deg"],
  ["7%", "10px", "25s", "-13s", "36deg"], ["46%", "10px", "29s", "-25s", "-8deg"],
  ["69%", "15px", "20s", "-3s", "-35deg"], ["97%", "18px", "31s", "-18s", "15deg"],
] as const;

export function SakuraPetals() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const hero = layer?.closest(".hero-scene");
    if (!layer || !hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) layer.classList.add("reduced-motion");
    const observer = new IntersectionObserver(([entry]) => {
      layer.classList.toggle("is-paused", !entry.isIntersecting);
    }, { threshold: 0.01 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={layerRef} className="sakura-petals" aria-hidden="true">
      {petals.map(([left, size, duration, delay, rotation], index) => (
        <span key={`${left}-${index}`} className={`sakura-petal petal-${index + 1}`} style={{ "--left": left, "--size": size, "--duration": duration, "--delay": delay, "--rotation": rotation } as CSSProperties} />
      ))}
      <span className="sakura-sparkle sparkle-one" />
      <span className="sakura-sparkle sparkle-two" />
      <span className="sakura-sparkle sparkle-three" />
      <span className="sakura-sparkle sparkle-four" />
    </div>
  );
}
