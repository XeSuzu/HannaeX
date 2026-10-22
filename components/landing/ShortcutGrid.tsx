"use client";

import Image from "next/image";
import { MotionConfig, motion } from "motion/react";

type Shortcut = {
  href: string;
  title: string;
  image: string;
  alt: string;
};

export function ShortcutGrid({ items }: { items: Shortcut[] }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="shortcut-grid">
        {items.map((item, index) => (
          <motion.a
            className="shortcut-card"
            href={item.href}
            key={item.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.42, delay: index * 0.07, ease: "easeOut" }}
            whileHover={{ y: -6, scale: 1.025 }}
            whileFocus={{ y: -4, scale: 1.015 }}
          >
            <span className="shortcut-image"><Image src={item.image} alt={item.alt} fill sizes="112px" /></span>
            <span>{item.title}</span>
          </motion.a>
        ))}
      </div>
    </MotionConfig>
  );
}
