"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function FadeIn({ children, className, delay = 0, amount = 0.2 }: { children: ReactNode; className?: string; delay?: number; amount?: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={`fade-in ${className ?? ""}`.trim()}
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.56, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
