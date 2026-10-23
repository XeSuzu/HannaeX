const steps = [
  ["01", "Incorporarla al servidor", "La invitación está prevista; por ahora no hay un enlace operativo."],
  ["02", "Hazla parte del lugar", "Elige cómo quieres que salude, acompañe y cuide los espacios de tu comunidad."],
  ["03", "Empezar a utilizarla", "La comunidad puede conversar, progresar, participar y cuidar sus espacios."],
] as const;

export function StartSteps() {
  return <div className="start-steps">{steps.map(([number, title, text], index) => <div className="start-step" key={title}><span className="start-step-number">{number}</span><div><h3>{title}</h3><p>{text}</p></div>{index < steps.length - 1 && <span className="start-step-line" aria-hidden="true" />}</div>)}</div>;
}
