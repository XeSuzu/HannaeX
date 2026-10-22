"use client";

import { Accordion } from "@base-ui/react/accordion";

const questions = [
  ["¿Qué funciones están disponibles?", "Hoshiko reúne interacciones, XP por mensajes y voz, rankings, roles por nivel, autojoin, estados, sugerencias, confesiones y herramientas de moderación. Algunas funciones dependen de la configuración del servidor."],
  ["¿Cómo es la configuración inicial?", "El staff incorpora el bot cuando la invitación esté disponible y configura los canales, roles y sistemas que quiera utilizar. La landing no ejecuta esa configuración."],
  ["¿Cómo funcionan los niveles?", "La actividad puede generar XP por mensajes y voz. El bot ofrece rank, top, leaderboard, tiers y roles por nivel, con valores que pueden variar según el servidor."],
  ["¿Qué papel conserva el staff en moderación?", "Hoshiko puede ayudar a señalar situaciones y guardar contexto, pero el staff conserva la decisión final. Las demos de esta página no ejecutan acciones reales."],
  ["¿Qué cambia con la personalización?", "Permite adaptar mensajes, estados, roles y sistemas del servidor para que la experiencia conserve el estilo de cada comunidad."],
  ["¿La invitación ya está disponible?", "Todavía no. El botón de invitación permanece marcado como próximamente para no simular un enlace operativo."],
] as const;

export function FAQ() {
  return <Accordion.Root className="faq-list">{questions.map(([question, answer], index) => <Accordion.Item className="faq-item" key={question}><Accordion.Header><Accordion.Trigger className="faq-trigger"> <span><b>{String(index + 1).padStart(2, "0")}</b>{question}</span><span className="faq-plus" aria-hidden="true">+</span></Accordion.Trigger></Accordion.Header><Accordion.Panel className="faq-panel"><p>{answer}</p></Accordion.Panel></Accordion.Item>)}</Accordion.Root>;
}
