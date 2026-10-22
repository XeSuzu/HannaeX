"use client";

import { useRef } from "react";

export function CosmicSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    node.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
  }

  return <div ref={ref} className="cosmic-spotlight" onPointerMove={handlePointerMove} aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit-star">✦</span><span className="orbit-star orbit-star-two">✧</span></div>;
}
