"use client";

import { Accordion } from "@base-ui/react/accordion";

const questions = [
  ["¿Qué puede hacer Hoshiko?", "Puede saludar a quienes llegan, compartir interacciones, acompañar el progreso, cuidar conversaciones y abrir pequeños espacios para confesiones o sugerencias. Cada servidor decide qué quiere usar."],
  ["¿Puedo adaptar Hoshiko a mi servidor?", "Sí. Puedes decidir dónde aparece, qué mensajes comparte y qué herramientas quieres tener cerca. La idea es que se sienta parte del lugar, no una visita que ocupa demasiado espacio."],
  ["¿Cómo funcionan los niveles?", "La actividad puede generar XP por mensajes y voz. El bot ofrece rank, top, leaderboard, tiers y roles por nivel, con valores que pueden variar según el servidor."],
  ["¿Cómo ayuda a cuidar la comunidad?", "Puede acompañar filtros, avisos y herramientas de moderación para que el equipo tenga más contexto cuando lo necesita. Las decisiones importantes siguen siendo de las personas que conocen el servidor."],
  ["¿Qué cambia con la personalización?", "Permite adaptar mensajes, estados, roles y sistemas del servidor para que la experiencia conserve el estilo de cada comunidad."],
  ["¿La invitación ya está disponible?", "Todavía no. El botón de invitación permanece marcado como próximamente para no simular un enlace operativo."],
] as const;

export function FAQ() {
  return <Accordion.Root className="faq-list">{questions.map(([question, answer], index) => <Accordion.Item className="faq-item" key={question}><Accordion.Header><Accordion.Trigger className="faq-trigger"> <span><b>{String(index + 1).padStart(2, "0")}</b>{question}</span><span className="faq-plus" aria-hidden="true">+</span></Accordion.Trigger></Accordion.Header><Accordion.Panel className="faq-panel"><p>{answer}</p></Accordion.Panel></Accordion.Item>)}</Accordion.Root>;
}
