import { PermissionFlagsBits } from "discord.js";

export interface CommandDetail {
  name: string;
  category: string;
  purpose: string;
  syntax: string;
  subcommands?: { name: string; desc: string; syntax?: string }[];
  options?: { name: string; desc: string; required: boolean; type?: string }[];
  userPerms?: string[];
  botPerms?: string[];
  roleHierarchyNote?: string;
  prerequisites?: string;
  reversibility?: string;
  logsGenerated?: string;
  examples: string[];
  status?: "operativa" | "beta" | "configuracion_requerida" | "mantenimiento";
  statusNote?: string;
  limitations?: string;
}

export const CURATED_COMMAND_DETAILS: Record<string, CommandDetail> = {
  // ================= MODERACIÓN =================
  warn: {
    name: "warn",
    category: "Moderation",
    purpose: "Registra una advertencia formal a un miembro por infringir las reglas del servidor.",
    syntax: "/warn usuario:@miembro motivo:<razón>",
    options: [
      { name: "usuario", desc: "Miembro del servidor al que se le aplicará la advertencia.", required: true, type: "Usuario" },
      { name: "motivo", desc: "Razón detallada de la advertencia (visible en el registro).", required: true, type: "Texto" },
    ],
    userPerms: ["Moderar Miembros (ModerateMembers)"],
    botPerms: ["Enviar Mensajes (SendMessages)", "Insertar Enlaces (EmbedLinks)"],
    roleHierarchyNote: "Hoshiko y el moderador no pueden advertir a miembros con rol superior o igual al suyo.",
    prerequisites: "Ninguno. Funciona de inmediato.",
    reversibility: "Totalmente reversible con `/unwarn` (por ID) o `/clearwarnings` (todas).",
    logsGenerated: "Se registra en la base de datos de advertencias y se publica en el canal de moderación (`modlog`) si está configurado.",
    examples: ["/warn usuario:@usuario motivo:Spam reiterado en canal de general"],
    status: "operativa",
  },
  warnings: {
    name: "warnings",
    category: "Moderation",
    purpose: "Muestra el historial acumulado de advertencias de un usuario en el servidor.",
    syntax: "/warnings usuario:@miembro",
    options: [
      { name: "usuario", desc: "Miembro del que se desea consultar el historial.", required: true, type: "Usuario" },
    ],
    userPerms: ["Moderar Miembros (ModerateMembers)"],
    botPerms: ["Enviar Mensajes", "Insertar Enlaces"],
    reversibility: "Comando de solo lectura informativa.",
    logsGenerated: "No genera logs de sanción.",
    examples: ["/warnings usuario:@usuario"],
    status: "operativa",
  },
  unwarn: {
    name: "unwarn",
    category: "Moderation",
    purpose: "Elimina una advertencia específica del historial de un usuario utilizando su ID numérico.",
    syntax: "/unwarn usuario:@miembro id:<ID_Advertencia>",
    options: [
      { name: "usuario", desc: "Miembro al que se le retirará la advertencia.", required: true, type: "Usuario" },
      { name: "id", desc: "ID numérico de la advertencia (consultable mediante `/warnings`).", required: true, type: "Texto" },
    ],
    userPerms: ["Moderar Miembros (ModerateMembers)"],
    botPerms: ["Enviar Mensajes", "Insertar Enlaces"],
    reversibility: "La eliminación de la advertencia es permanente en la base de datos.",
    logsGenerated: "Registra la revocación en el canal de auditoría `modlog`.",
    examples: ["/unwarn usuario:@usuario id:1"],
    status: "operativa",
  },
  clearwarnings: {
    name: "clearwarnings",
    category: "Moderation",
    purpose: "Limpia y elimina por completo todas las advertencias registradas de un usuario en el servidor.",
    syntax: "/clearwarnings usuario:@miembro",
    options: [
      { name: "usuario", desc: "Miembro al que se le restablecerá el contador a 0.", required: true, type: "Usuario" },
    ],
    userPerms: ["Gestionar Servidor (ManageGuild)"],
    botPerms: ["Enviar Mensajes", "Insertar Enlaces"],
    reversibility: "Acción permanente. No se pueden recuperar advertencias purgadas.",
    logsGenerated: "Notifica el reseteo completo en el canal `modlog`.",
    examples: ["/clearwarnings usuario:@usuario"],
    status: "operativa",
  },
  mute: {
    name: "mute",
    category: "Moderation",
    purpose: "Aplica un aislamiento temporal (Timeout nativo de Discord) impidiendo enviar mensajes o hablar en voz.",
    syntax: "/mute usuario:@miembro tiempo:<duración> [motivo:<razón>]",
    options: [
      { name: "usuario", desc: "Miembro a silenciar.", required: true, type: "Usuario" },
      { name: "tiempo", desc: "Duración del aislamiento (ej: 10m, 1h, 2d). Máximo 28 días.", required: true, type: "Texto" },
      { name: "motivo", desc: "Razón del aislamiento.", required: false, type: "Texto" },
    ],
    userPerms: ["Moderar Miembros (ModerateMembers)"],
    botPerms: ["Moderar Miembros (ModerateMembers)"],
    roleHierarchyNote: "El bot no puede silenciar a usuarios cuyo rol sea igual o superior al rol más alto de Hoshiko.",
    limitations: "La API de Discord impone un límite máximo estricto de 28 días para timeouts nativos.",
    reversibility: "Reversible inmediatamente antes de su expiración mediante `/unmute`.",
    logsGenerated: "Publica la sanción en `modlog` con moderador responsable y duración.",
    examples: ["/mute usuario:@usuario tiempo:30m motivo:Comportamiento tóxico en chat"],
    status: "operativa",
  },
  tempmute: {
    name: "tempmute",
    category: "Moderation",
    purpose: "Alias explícito para aislar temporalmente a un miembro (Timeout nativo de Discord).",
    syntax: "/tempmute usuario:@miembro tiempo:<duración> [motivo:<razón>]",
    options: [
      { name: "usuario", desc: "Miembro a silenciar.", required: true, type: "Usuario" },
      { name: "tiempo", desc: "Duración (ej: 15m, 2h, 1d).", required: true, type: "Texto" },
      { name: "motivo", desc: "Razón del silencio.", required: false, type: "Texto" },
    ],
    userPerms: ["Moderar Miembros (ModerateMembers)"],
    botPerms: ["Moderar Miembros (ModerateMembers)"],
    roleHierarchyNote: "Requiere que Hoshiko tenga un rol más alto que el usuario en la jerarquía del servidor.",
    reversibility: "Reversible en cualquier momento con `/unmute`.",
    logsGenerated: "Emite reporte en `modlog`.",
    examples: ["/tempmute usuario:@usuario tiempo:1h motivo:Flood reiterado"],
    status: "operativa",
  },
  unmute: {
    name: "unmute",
    category: "Moderation",
    purpose: "Retira el aislamiento / timeout a un miembro antes de que expire su tiempo.",
    syntax: "/unmute usuario:@miembro",
    options: [
      { name: "usuario", desc: "Miembro al que se le levantará el silencio.", required: true, type: "Usuario" },
    ],
    userPerms: ["Moderar Miembros (ModerateMembers)"],
    botPerms: ["Moderar Miembros (ModerateMembers)"],
    reversibility: "Inmediata; el usuario recupera sus permisos de participación.",
    logsGenerated: "Registra el levantamiento de la sanción en `modlog`.",
    examples: ["/unmute usuario:@usuario"],
    status: "operativa",
  },
  kick: {
    name: "kick",
    category: "Moderation",
    purpose: "Expulsa a un miembro del servidor. El usuario puede volver a unirse si cuenta con una invitación válida.",
    syntax: "/kick usuario:@miembro [razon:<motivo>]",
    options: [
      { name: "usuario", desc: "Miembro a expulsar.", required: true, type: "Usuario" },
      { name: "razon", desc: "Motivo de la expulsión.", required: false, type: "Texto" },
    ],
    userPerms: ["Expulsar Miembros (KickMembers)"],
    botPerms: ["Expulsar Miembros (KickMembers)"],
    roleHierarchyNote: "El bot no puede expulsar a dueños, administradores ni miembros con rol superior al suyo.",
    reversibility: "No es un baneo; el usuario puede reingresar si dispone de un enlace de invitación.",
    logsGenerated: "Registra la expulsión en `modlog`.",
    examples: ["/kick usuario:@usuario razon:Incumplimiento reiterado de normas"],
    status: "operativa",
  },
  softban: {
    name: "softban",
    category: "Moderation",
    purpose: "Banea y desbanea inmediatamente a un usuario con el objetivo de purgar sus mensajes recientes.",
    syntax: "/softban usuario:@miembro [razon:<motivo>] [eliminar-mensajes:<días>]",
    options: [
      { name: "usuario", desc: "Miembro al que se le aplicará softban.", required: true, type: "Usuario" },
      { name: "razon", desc: "Motivo del softban.", required: false, type: "Texto" },
      { name: "eliminar-mensajes", desc: "Días de historial de mensajes a purgar (1 a 7 días).", required: false, type: "Número" },
    ],
    userPerms: ["Banear Miembros (BanMembers)"],
    botPerms: ["Banear Miembros (BanMembers)"],
    reversibility: "El usuario queda desbaneado automáticamente al instante.",
    logsGenerated: "Registra softban y purga de mensajes en `modlog`.",
    examples: ["/softban usuario:@usuario razon:Raid de spam eliminar-mensajes:7"],
    status: "operativa",
  },
  ban: {
    name: "ban",
    category: "Moderation",
    purpose: "Banea permanentemente a un usuario del servidor, impidiendo su reingreso.",
    syntax: "/ban usuario:@miembro [razon:<motivo>] [eliminar-mensajes:<días>]",
    options: [
      { name: "usuario", desc: "Usuario o ID a banear.", required: true, type: "Usuario" },
      { name: "razon", desc: "Razón documentada del baneo.", required: false, type: "Texto" },
      { name: "eliminar-mensajes", desc: "Días de mensajes a borrar (0 a 7 días).", required: false, type: "Número" },
    ],
    userPerms: ["Banear Miembros (BanMembers)"],
    botPerms: ["Banear Miembros (BanMembers)"],
    roleHierarchyNote: "Requiere jerarquía de roles superior al objetivo.",
    reversibility: "Reversible mediante `/unban`.",
    logsGenerated: "Genera informe detallado en `modlog` con opción de apelación si está configurada.",
    examples: ["/ban usuario:@usuario razon:Ataque raid / spam masivo eliminar-mensajes:1"],
    status: "operativa",
  },
  tempban: {
    name: "tempban",
    category: "Moderation",
    purpose: "Aplica un baneo con duración programada; al expirar el tiempo, Hoshiko desbanea automáticamente.",
    syntax: "/tempban usuario:@miembro tiempo:<duración> [razon:<motivo>]",
    options: [
      { name: "usuario", desc: "Usuario a banear temporalmente.", required: true, type: "Usuario" },
      { name: "tiempo", desc: "Duración del baneo (ej: 7d, 2w, 1M).", required: true, type: "Texto" },
      { name: "razon", desc: "Razón de la sanción.", required: false, type: "Texto" },
    ],
    userPerms: ["Banear Miembros (BanMembers)"],
    botPerms: ["Banear Miembros (BanMembers)"],
    reversibility: "Se desbanea automáticamente tras expirar el temporizador, o manualmente con `/unban`.",
    logsGenerated: "Registra inicio y fin de la sanción en `modlog`.",
    examples: ["/tempban usuario:@usuario tiempo:7d razon:Falta grave reiterada"],
    status: "operativa",
  },
  unban: {
    name: "unban",
    category: "Moderation",
    purpose: "Retira el baneo a un usuario mediante su ID o nombre.",
    syntax: "/unban usuario:<ID_o_tag> [razon:<motivo>]",
    options: [
      { name: "usuario", desc: "ID del usuario desbaneado.", required: true, type: "Texto" },
      { name: "razon", desc: "Razón del desbaneo.", required: false, type: "Texto" },
    ],
    userPerms: ["Banear Miembros (BanMembers)"],
    botPerms: ["Banear Miembros (BanMembers)"],
    reversibility: "El usuario queda habilitado para volver a unirse.",
    logsGenerated: "Registra el desbaneo en `modlog`.",
    examples: ["/unban usuario:123456789012345678 razon:Apelación concedida"],
    status: "operativa",
  },
  massban: {
    name: "massban",
    category: "Moderation",
    purpose: "Banea en lote a múltiples atacantes o bots separando sus IDs por espacios.",
    syntax: "/massban usuarios:<ID1 ID2 ID3...> [razon:<motivo>]",
    options: [
      { name: "usuarios", desc: "Lista de IDs de usuario separadas por espacios.", required: true, type: "Texto" },
      { name: "razon", desc: "Razón compartida para todos los baneos.", required: false, type: "Texto" },
    ],
    userPerms: ["Banear Miembros (BanMembers)"],
    botPerms: ["Banear Miembros (BanMembers)"],
    prerequisites: "Recomendado durante ataques de incursión masiva (Raid).",
    logsGenerated: "Registra cada baneo secuencialmente evitando bloqueos por rate-limit.",
    examples: ["/massban usuarios:111222333 444555666 razon:Cuentas de ataque"],
    status: "operativa",
  },
  "setup-automod": {
    name: "setup-automod",
    category: "Moderation",
    purpose: "Configura el motor de Auto-Mod de Hoshiko (Anti-Spam, Anti-Links, Filtro de Palabras, IA Moderación).",
    syntax: "/setup-automod <view|modulo|allow-link|remove-link|whitelist-user|ai-mode>",
    subcommands: [
      { name: "view", desc: "Muestra el estado actual de los módulos de moderación automática." },
      { name: "modulo", desc: "Activa o desactiva un módulo específico (antiSpam, antiLinks, wordFilter, aiModeration)." },
      { name: "allow-link", desc: "Añade un dominio a la whitelist de enlaces permitidos." },
      { name: "remove-link", desc: "Elimina un dominio de la lista de permitidos." },
      { name: "whitelist-user", desc: "Exenta a un usuario de las sanciones automáticas." },
    ],
    userPerms: ["Gestionar Servidor (ManageGuild)"],
    botPerms: ["Gestionar Mensajes", "Moderar Miembros", "Ver Registro de Auditoría"],
    prerequisites: "Configurar un canal de `modlog` con `/setup-logs` para recibir alertas.",
    examples: ["/setup-automod view", "/setup-automod modulo nombre:Anti-Raid activo:True"],
    status: "beta",
    statusNote: "Módulos de seguridad en evolución activa (Beta).",
  },
  "setup-logs": {
    name: "setup-logs",
    category: "Moderation",
    purpose: "Configura los canales de destino para la auditoría de moderación, servidor y confesiones.",
    syntax: "/setup-logs",
    userPerms: ["Gestionar Servidor (ManageGuild)"],
    botPerms: ["Ver Canales", "Enviar Mensajes", "Insertar Enlaces"],
    prerequisites: "Tener creados los canales de texto destinados a los registros.",
    examples: ["/setup-logs"],
    status: "operativa",
  },
  setup: {
    name: "setup",
    category: "Moderation",
    purpose: "Panel maestro e interactivo para ajustar seguridad, moderación y registros generales.",
    syntax: "/setup",
    userPerms: ["Administrador (Administrator)"],
    botPerms: ["Administrador (Recomendado para configuración completa)"],
    examples: ["/setup"],
    status: "operativa",
  },
  whitelist: {
    name: "whitelist",
    category: "Moderation",
    purpose: "Administra la lista de dominios web autorizados en el filtro Anti-Links.",
    syntax: "/whitelist <add|remove|list> [dominio]",
    subcommands: [
      { name: "add", desc: "Permite un nuevo dominio (ej: youtube.com)." },
      { name: "remove", desc: "Elimina un dominio de la lista de excepciones." },
      { name: "list", desc: "Muestra todos los dominios permitidos actualmente." },
    ],
    userPerms: ["Gestionar Servidor (ManageGuild)"],
    botPerms: ["Gestionar Mensajes"],
    examples: ["/whitelist add dominio:twitch.tv", "/whitelist list"],
    status: "operativa",
  },
  "automod-history": {
    name: "automod-history",
    category: "Moderation",
    purpose: "Consulta las sanciones y detecciones automáticas registradas sobre un miembro.",
    syntax: "/automod-history usuario:@miembro [limite:<1-50>]",
    options: [
      { name: "usuario", desc: "Miembro a consultar.", required: true, type: "Usuario" },
      { name: "limite", desc: "Cantidad de eventos a mostrar (por defecto 10).", required: false, type: "Número" },
    ],
    userPerms: ["Moderar Miembros (ModerateMembers)"],
    botPerms: ["Enviar Mensajes", "Insertar Enlaces"],
    examples: ["/automod-history usuario:@usuario limite:15"],
    status: "operativa",
  },

  // ================= CONFESIONES =================
  confess: {
    name: "confess",
    category: "Confessions",
    purpose: "Envía una confesión o mensaje anónimo al canal configurado del servidor.",
    syntax: "/confess",
    options: [],
    prerequisites: "El servidor debe tener configurado el canal con `/setup-confessions`.",
    limitations: "Cooldown de 30 segundos entre confesiones. Solo imágenes JPG, PNG o WEBP de Discord.",
    reversibility: "Un moderador puede borrarla rápidamente con el botón de papelera o con `/confession-delete`.",
    examples: ["/confess"],
    status: "configuracion_requerida",
  },
  "setup-confessions": {
    name: "setup-confessions",
    category: "Confessions",
    purpose: "Configura el canal receptor de confesiones, canal de logs de auditoría y fondo visual.",
    syntax: "/setup-confessions [logs_channel:#canal] [visual:True|False] [fondo:sakura|midnight...]",
    userPerms: ["Administrador (Administrator)"],
    botPerms: ["Ver Canales", "Enviar Mensajes", "Insertar Enlaces", "Adjuntar Archivos"],
    examples: ["/setup-confessions visual:True fondo:midnight"],
    status: "operativa",
  },
  "confession-delete": {
    name: "confession-delete",
    category: "Confessions",
    purpose: "Elimina forzosamente una confesión publicada mediante su ID numérico.",
    syntax: "/confession-delete id:<número> razon:<motivo>",
    userPerms: ["Gestionar Mensajes (ManageMessages)"],
    botPerms: ["Gestionar Mensajes"],
    examples: ["/confession-delete id:42 razon:Contenido ofensivo"],
    status: "operativa",
  },
  "confession-check": {
    name: "confession-check",
    category: "Confessions",
    purpose: "Investiga la identidad del remitente de una confesión anónima (exclusivo para emergencias).",
    syntax: "/confession-check id:<número>",
    userPerms: ["Administrador (Administrator)"],
    examples: ["/confession-check id:42"],
    status: "operativa",
  },
  "confession-ban": {
    name: "confession-ban",
    category: "Confessions",
    purpose: "Bloquea a un usuario impidiendo que vuelva a enviar confesiones en el servidor.",
    syntax: "/confession-ban usuario:@miembro [motivo:<razón>]",
    userPerms: ["Moderar Miembros (ModerateMembers)"],
    examples: ["/confession-ban usuario:@usuario motivo:Abuso reiterado"],
    status: "operativa",
  },

  // ================= NIVELES & PROGRESIÓN =================
  rank: {
    name: "rank",
    category: "Levels",
    purpose: "Muestra tu tarjeta gráfica con nivel, XP actual, barra de progreso y posición en este servidor.",
    syntax: "/rank [usuario:@miembro] [fondo:sakura|midnight|cyberpunk|emerald|sunset|default]",
    options: [
      { name: "usuario", desc: "Miembro a consultar (por defecto tú mismo).", required: false, type: "Usuario" },
      { name: "fondo", desc: "Tema visual de fondo para tu tarjeta.", required: false, type: "Opciones" },
    ],
    botPerms: ["Adjuntar Archivos (AttachFiles)"],
    examples: ["/rank", "/rank usuario:@amigo fondo:sakura"],
    status: "operativa",
  },
  vcrank: {
    name: "vcrank",
    category: "Levels",
    purpose: "Muestra tu nivel y horas acumuladas en canales de voz en una tarjeta gráfica.",
    syntax: "/vcrank [usuario:@miembro] [fondo:sakura|midnight|cyberpunk...]",
    options: [
      { name: "usuario", desc: "Miembro a consultar.", required: false, type: "Usuario" },
      { name: "fondo", desc: "Fondo visual.", required: false, type: "Opciones" },
    ],
    botPerms: ["Adjuntar Archivos"],
    examples: ["/vcrank", "/vcrank fondo:midnight"],
    status: "operativa",
  },
  top: {
    name: "top",
    category: "Levels",
    purpose: "Visualiza la tabla de clasificación del servidor con podio destacado del Top 3 y navegación.",
    syntax: "/top <messages|voice>",
    subcommands: [
      { name: "messages", desc: "Top de usuarios por mensajes de texto enviados" },
      { name: "voice", desc: "Top de usuarios por tiempo acumulado en voz" },
    ],
    examples: ["/top messages", "/top voice"],
    status: "operativa",
  },
  leaderboard: {
    name: "leaderboard",
    category: "Levels",
    purpose: "Muestra la tabla de clasificación local con los miembros con mayor XP del servidor.",
    syntax: "/leaderboard [categoria:text|voice|weekly] [pagina:<número>]",
    examples: ["/leaderboard", "/leaderboard categoria:voice pagina:2"],
    status: "operativa",
  },
  "weekly-leaderboard": {
    name: "weekly-leaderboard",
    category: "Levels",
    purpose: "Muestra el ranking de actividad semanal de texto y voz del servidor.",
    syntax: "/weekly-leaderboard [pagina:<número>]",
    examples: ["/weekly-leaderboard"],
    status: "operativa",
  },
  "setup-levels": {
    name: "setup-levels",
    category: "Levels",
    purpose: "Configura el sistema de niveles, tasas de XP por mensaje/voz, personalización de tarjeta y canales.",
    syntax: "/setup-levels <view|sistema|xp-mensajes|xp-voz|canales|personalizar-card>",
    userPerms: ["Gestionar Servidor (ManageGuild)"],
    examples: ["/setup-levels view"],
    status: "operativa",
  },
  globalrank: {
    name: "globalrank",
    category: "Levels",
    purpose: "Rango y XP global en todos los servidores donde opera Hoshiko.",
    syntax: "/globalrank",
    status: "mantenimiento",
    statusNote: "Desactivado temporalmente hasta nuevo aviso por optimización de base de datos.",
    examples: ["/globalrank"],
  },
  "global-leaderboard": {
    name: "global-leaderboard",
    category: "Levels",
    purpose: "Clasificación global de usuarios en la red de Hoshiko.",
    syntax: "/global-leaderboard",
    status: "mantenimiento",
    statusNote: "Desactivado temporalmente hasta nuevo aviso.",
    examples: ["/global-leaderboard"],
  },

  // ================= INTELIGENCIA ARTIFICIAL =================
  ai: {
    name: "ai",
    category: "AI",
    purpose: "Abre tu panel interactivo personal para consultar cuotas diarias de 24h, estilo conversacional y recuerdos.",
    syntax: "/ai <panel|usage|tester>",
    subcommands: [
      { name: "panel", desc: "Abre tu panel interactivo personal (cuotas, estilo y recuerdos)" },
      { name: "usage", desc: "Consulta tu saldo de cuotas diario para conversación e investigación" },
      { name: "tester", desc: "Gestión de testers autorizados con cuotas ampliadas (Admin)" },
    ],
    examples: ["/ai panel", "/ai usage"],
    status: "operativa",
  },
  memory: {
    name: "memory",
    category: "AI",
    purpose: "Gestiona tu memoria personal y soberana recordada por Hoshiko con privacidad estricta.",
    syntax: "/memory <ver|guardar|borrar|ajustes|legados>",
    subcommands: [
      { name: "ver", desc: "Muestra tus recuerdos personales guardados" },
      { name: "guardar", desc: "Guarda un recuerdo explícito en tu memoria personal" },
      { name: "borrar", desc: "Borra recuerdos específicos o todo tu historial" },
      { name: "ajustes", desc: "Activa o desactiva tu memoria personal" },
      { name: "legados", desc: "Revisa y confirma recuerdos anteriores con tu consentimiento" },
    ],
    examples: ["/memory ver", "/memory guardar recuerdo:Me gusta el té de jazmín", "/memory borrar"],
    status: "operativa",
  },

  // ================= INFORMACIÓN & UTILIDAD =================
  invite: {
    name: "invite",
    category: "Utility",
    purpose: "Genera los enlaces oficiales de invitación recomendada y completa para tu servidor.",
    syntax: "/invite",
    examples: ["/invite"],
    status: "operativa",
  },
  infocreator: {
    name: "infocreator",
    category: "Information",
    purpose: "Conoce la historia, versión, estadísticas globales y creadores del proyecto Hoshiko.",
    syntax: "/infocreator",
    examples: ["/infocreator"],
    status: "operativa",
  },
  premium: {
    name: "premium",
    category: "Information",
    purpose: "Consulta el estado de suscripción y los beneficios vigentes de Hoshiko Premium en tu servidor.",
    syntax: "/premium",
    examples: ["/premium"],
    status: "operativa",
  },
  serverinfo: {
    name: "serverinfo",
    category: "Information",
    purpose: "Muestra una ficha interactiva completa con estadísticas, roles, canales y boosts del servidor.",
    syntax: "/serverinfo",
    examples: ["/serverinfo"],
    status: "operativa",
  },
  stats: {
    name: "stats",
    category: "Performance",
    purpose: "Muestra la salud operativa del bot: memoria RAM, CPU, base de datos MongoDB y latencia de red.",
    syntax: "/stats",
    examples: ["/stats"],
    status: "operativa",
  },
  case: {
    name: "case",
    category: "Moderation",
    purpose: "Consulta los detalles de un caso disciplinario registrado mediante su número correlativo.",
    syntax: "/case numero:<ID_Caso>",
    options: [
      { name: "numero", desc: "Número correlativo del caso disciplinario a consultar.", required: true, type: "Entero" },
    ],
    userPerms: ["Moderar Miembros (ModerateMembers)"],
    examples: ["/case numero:12"],
    status: "operativa",
  },
  cases: {
    name: "cases",
    category: "Moderation",
    purpose: "Lista los casos disciplinarios recientes del servidor o el historial completo de un usuario.",
    syntax: "/cases [usuario:@miembro] [pagina:<número>]",
    userPerms: ["Moderar Miembros (ModerateMembers)"],
    examples: ["/cases", "/cases usuario:@usuario"],
    status: "operativa",
  },
  wordfilter: {
    name: "wordfilter",
    category: "Moderation",
    purpose: "Administra la lista de palabras bloqueadas por el filtro automático de chat con detección anti-evasión.",
    syntax: "/wordfilter <agregar|eliminar|listar>",
    userPerms: ["Gestionar Servidor (ManageGuild)"],
    examples: ["/wordfilter listar", "/wordfilter agregar palabra:palabrota"],
    status: "operativa",
  },
};

/**
 * Genera dinámicamente un objeto CommandDetail para cualquier comando registrado,
 * fusionando metadatos curados si existen con la introspección real de Discord.js.
 */
export function getCommandDetail(
  name: string,
  slashCmd: any,
): CommandDetail {
  const curated = CURATED_COMMAND_DETAILS[name];
  if (curated) return curated;

  const data = slashCmd?.data;
  const rawJson = data?.toJSON ? data.toJSON() : null;

  const desc = rawJson?.description || slashCmd?.description || "Sin descripción disponible.";
  const rawOptions = rawJson?.options || [];

  const subcommands: { name: string; desc: string; syntax?: string }[] = [];
  const options: { name: string; desc: string; required: boolean; type?: string }[] = [];

  for (const opt of rawOptions) {
    if (opt.type === 1 || opt.type === 2) {
      subcommands.push({
        name: opt.name,
        desc: opt.description,
        syntax: `/${name} ${opt.name}`,
      });
    } else {
      options.push({
        name: opt.name,
        desc: opt.description,
        required: Boolean(opt.required),
        type: getOptionTypeName(opt.type),
      });
    }
  }

  const userPerms: string[] = [];
  if (rawJson?.default_member_permissions) {
    userPerms.push(`Permiso base: ${rawJson.default_member_permissions}`);
  }

  return {
    name,
    category: slashCmd?.category || "Utility",
    purpose: desc,
    syntax: subcommands.length > 0
      ? `/${name} <${subcommands.map((s) => s.name).join("|")}>`
      : `/${name}${options.map((o) => (o.required ? ` <${o.name}>` : ` [${o.name}]`)).join("")}`,
    subcommands: subcommands.length > 0 ? subcommands : undefined,
    options: options.length > 0 ? options : undefined,
    userPerms: userPerms.length > 0 ? userPerms : ["Disponible para todos los miembros"],
    botPerms: ["Ver Canales", "Enviar Mensajes", "Insertar Enlaces"],
    examples: subcommands.length > 0
      ? [`/${name} ${subcommands[0].name}`]
      : [`/${name}`],
    status: "operativa",
  };
}

function getOptionTypeName(type: number): string {
  switch (type) {
    case 3: return "Texto";
    case 4: return "Entero";
    case 5: return "Booleano";
    case 6: return "Usuario";
    case 7: return "Canal";
    case 8: return "Rol";
    case 9: return "Mencionable";
    case 10: return "Número";
    case 11: return "Archivo";
    default: return "Opción";
  }
}
