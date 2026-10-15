import { GlobalFonts } from "@napi-rs/canvas";
import path from "path";

try {
  GlobalFonts.registerFromPath(
    path.join(__dirname, "../../../../../assets/fonts/NotoColorEmoji.ttf"),
    "NotoEmoji",
  );
} catch {}

export const BANNERS_DIR = path.join(
  __dirname,
  "../../../../assets/images/banners/ship-banners",
);

export interface ShipTier {
  range: [number, number];
  color: string;
  gradient: [string, string];
  heart: string;
  title: string;
  messages: string[];
  particles: number;
  glow: number;
  threadStyle: "none" | "weak" | "normal" | "strong" | "destiny";
}

export const SHIP_TIERS: ShipTier[] = [
  {
    range: [0, 15],
    color: "#2c3e50",
    gradient: ["#1a1a2e", "#2c3e50"],
    heart: "💔",
    title: "Zona Helada",
    messages: [
      "Ni siquiera el sol podría derretir este hielo.",
      "Houston, no tenemos conexión.",
      'El universo dijo: "Nop".',
      "Más distantes que Plutón del Sol.",
      "Mejor ser extraños que esto.",
    ],
    particles: 10,
    glow: 0,
    threadStyle: "none",
  },
  {
    range: [16, 35],
    color: "#5d6d7e",
    gradient: ["#34495e", "#5d6d7e"],
    heart: "🌧️",
    title: "Nublado con Lluvia",
    messages: [
      "Quizás en otra dimensión...",
      'La vibra es de "hola y adiós".',
      "Falta chispa, mya.",
      "Como café sin azúcar: funciona, pero no emociona.",
      "Amistad del montón.",
    ],
    particles: 15,
    glow: 5,
    threadStyle: "weak",
  },
  {
    range: [36, 55],
    color: "#85929e",
    gradient: ["#566573", "#85929e"],
    heart: "🤝",
    title: "Zona Amistosa",
    messages: [
      "Buenos amigos, nada más.",
      "Se llevan bien, pero sin fuegos artificiales.",
      'Energía de "hermanos de otra madre".',
      "Conexión estable, sin drama.",
      "Cómodos juntos, pero sin mariposas.",
    ],
    particles: 20,
    glow: 8,
    threadStyle: "weak",
  },
  {
    range: [56, 70],
    color: "#f39c12",
    gradient: ["#e67e22", "#f39c12"],
    heart: "🧡",
    title: "Calorcito Agradable",
    messages: [
      "¡Aquí hay potencial, mya!",
      "Se nota que hay conexión.",
      "Energía bonita y cálida.",
      "Podrían ser algo especial.",
      "Las estrellas sonríen un poco.",
    ],
    particles: 30,
    glow: 12,
    threadStyle: "normal",
  },
  {
    range: [71, 85],
    color: "#e74c3c",
    gradient: ["#c0392b", "#e74c3c"],
    heart: "❤️",
    title: "Química Fuerte",
    messages: [
      "¡Houston, tenemos TENSIÓN!",
      "Esto promete mucho.",
      "La vibra es INTENSA.",
      "Se sienten las chispas desde aquí.",
      "El destino guiña un ojo.",
    ],
    particles: 40,
    glow: 18,
    threadStyle: "strong",
  },
  {
    range: [86, 94],
    color: "#e91e63",
    gradient: ["#c2185b", "#e91e63"],
    heart: "💖",
    title: "Fuego y Pasión",
    messages: [
      "¡ESTO ES REAL, MYA!",
      "Química de laboratorio nivel nuclear.",
      "Las estrellas están alineadas.",
      "Conexión de otro nivel.",
      "Prácticamente imanes.",
    ],
    particles: 50,
    glow: 25,
    threadStyle: "strong",
  },
  {
    range: [95, 100],
    color: "#9c27b0",
    gradient: ["#7b1fa2", "#e91e63"],
    heart: "💝",
    title: "✨ DESTINO ABSOLUTO ✨",
    messages: [
      "¡¡¡ALMAS GEMELAS!!!",
      "Escrito en las estrellas y grabado en piedra.",
      "El universo entero los empuja juntos.",
      "Esto es LEGENDARIO.",
      "Cupido renunció porque ya está hecho.",
      "¿Boda cuándo? 💒",
    ],
    particles: 70,
    glow: 35,
    threadStyle: "destiny",
  },
];
