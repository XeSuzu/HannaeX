"use client";

import { motion, useReducedMotion } from "motion/react";

export function BorderBeam() {
  const reducedMotion = useReducedMotion();
  return <motion.span className="border-beam" aria-hidden="true" animate={reducedMotion ? undefined : { offsetDistance: ["0%", "100%"] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />;
}
