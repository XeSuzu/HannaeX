import { PermissionFlagsBits } from "discord.js";

export interface CommandDetail {
  name: string;
  category: string;
  purpose: string;
  syntax: string;
  prefixSyntax?: string;
  aliases?: string[];
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
    purpose: "Configura el motor de Auto-Mod de Hoshiko, exclusiones para alianzas/plantillas y sincronización nativa con Discord.",
    syntax: "/setup-automod <view|modulo|canal-exento|rol-exento|allow-link|remove-link|whitelist-user|ai-mode|sync>",
    prefixSyntax: "hoshi automod <view|canal|rol|sync>",
    subcommands: [
      { name: "view", desc: "Muestra el panel de configuración, módulos activos, canales y roles exentos." },
      { name: "canal-exento", desc: "Exenta un canal de automod, anti-links y anti-spam (ej. #alianzas, #plantillas e hilos)." },
      { name: "rol-exento", desc: "Exenta un rol de automod, anti-links y anti-spam (ej. @Alianzas, @Staff, @VIP)." },
      { name: "modulo", desc: "Activa o desactiva módulos de seguridad (antiSpam, antiLinks, wordFilter, aiModeration)." },
      { name: "allow-link", desc: "Añade un dominio a la whitelist de enlaces permitidos." },
      { name: "remove-link", desc: "Elimina un dominio de la whitelist de permitidos." },
      { name: "whitelist-user", desc: "Exenta a un usuario específico de las sanciones automáticas." },
      { name: "ai-mode", desc: "Configura la IA de moderación en modo shadow (auditoría en logs) o enforce (sanción directa)." },
      { name: "sync", desc: "Sincroniza y despliega las reglas de seguridad oficiales con el AutoMod nativo de Discord (0ms)." },
    ],
    userPerms: ["Gestionar Servidor (ManageGuild)"],
    botPerms: ["Gestionar Mensajes", "Moderar Miembros", "Gestionar Servidor"],
    prerequisites: "Configurar canales de logs con `/setup-logs` para registrar detecciones y auditorías.",
    examples: [
      "/setup-automod view",
      "/setup-automod canal-exento canal:#alianzas agregar:True",
      "/setup-automod rol-exento rol:@Alianzas agregar:True",
      "/setup-automod sync",
      "hoshi automod canal add #plantillas",
      "hoshi automod sync",
    ],
    status: "operativa",
    statusNote: "Totalmente integrado con el protocolo AutoMod de Discord (0ms) y heurística contra falso positivo de plantillas.",
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

  // ================= PERFILES & ACTIVIDAD (PREFIX ENABLED) =================
  activity: {
    name: "activity",
    category: "Profiles",
    purpose: "Muestra la actividad en tiempo real de Discord de un miembro o tarjeta visual de Spotify si está escuchando música.",
    syntax: "/activity [usuario:@miembro]",
    prefixSyntax: "hoshi activity [@usuario|ID] | xactivity | xact | xspotify",
    aliases: ["act", "spotify", "presence"],
    options: [
      { name: "usuario", desc: "Usuario del que deseas ver la actividad (opcional).", required: false, type: "Usuario" },
    ],
    examples: ["/activity", "hoshi activity @usuario", "xspotify"],
    status: "operativa",
  },
  avatar: {
    name: "avatar",
    category: "Profiles",
    purpose: "Muestra el avatar y banner de un usuario en máxima resolución con botones de descarga directa en formatos PNG, JPG, WEBP y GIF.",
    syntax: "/avatar [usuario:@miembro]",
    prefixSyntax: "hoshi avatar [@usuario|ID] | hoshi banner [@usuario|ID] | xav | xpfp | xfoto",
    aliases: ["av", "pfp", "foto", "banner"],
    options: [
      { name: "usuario", desc: "Usuario al que deseas ver el avatar o banner.", required: false, type: "Usuario" },
    ],
    examples: ["/avatar", "hoshi avatar @usuario", "hoshi banner @usuario", "xav"],
    status: "operativa",
  },
  avatars: {
    name: "avatars",
    category: "Profiles",
    purpose: "Genera una cuadrícula Canvas con el historial de avatares guardados del usuario (globales y de servidor con Nitro).",
    syntax: "/avatars [usuario:@miembro]",
    prefixSyntax: "hoshi avatars [@usuario|ID] | xavatars",
    options: [
      { name: "usuario", desc: "Selecciona al usuario cuyo historial deseas ver.", required: false, type: "Usuario" },
    ],
    examples: ["/avatars", "hoshi avatars @usuario"],
    status: "operativa",
  },
  users: {
    name: "users",
    category: "Profiles",
    purpose: "Muestra las estadísticas de miembros del servidor o el historial guardado de un usuario en específico.",
    syntax: "/users [usuario:@miembro]",
    prefixSyntax: "hoshi users [@usuario|ID] | xusers",
    options: [
      { name: "usuario", desc: "Selecciona un usuario para ver su historial.", required: false, type: "Usuario" },
    ],
    examples: ["/users", "hoshi users @usuario"],
    status: "operativa",
  },
  userinfo: {
    name: "userinfo",
    category: "Profiles",
    purpose: "Muestra una ficha detallada con información, roles, permisos y estado de un usuario.",
    syntax: "/userinfo [usuario:@miembro]",
    prefixSyntax: "hoshi userinfo [@usuario|ID] | xuserinfo | xwhois | xui | xperfil",
    aliases: ["whois", "ui", "perfil"],
    options: [
      { name: "usuario", desc: "Usuario del que deseas ver la información.", required: false, type: "Usuario" },
    ],
    examples: ["/userinfo", "hoshi userinfo @usuario", "xwhois @usuario"],
    status: "operativa",
  },

  // ================= INTERACCIONES SOCIALES (PREFIX ENABLED) =================
  hug: {
    name: "hug",
    category: "Interactions",
    purpose: "Envía un abrazo lleno de cariño con GIF anime e interfaz interactiva con botones para aceptar o rechazar.",
    syntax: "/hug usuario:@miembro",
    prefixSyntax: "hoshi hug <@usuario|ID|reply> | xhug",
    options: [
      { name: "usuario", desc: "A quién deseas abrazar.", required: true, type: "Usuario" },
    ],
    examples: ["/hug usuario:@amigo", "hoshi hug @amigo", "xhug"],
    status: "operativa",
  },
  cuddle: {
    name: "cuddle",
    category: "Interactions",
    purpose: "Acurrúcate tiernamente con alguien con botones interactivos y GIFs animados seleccionados.",
    syntax: "/cuddle usuario:@miembro",
    prefixSyntax: "hoshi cuddle <@usuario|ID|reply> | xcuddle",
    options: [
      { name: "usuario", desc: "Con quién deseas acurrucarte.", required: true, type: "Usuario" },
    ],
    examples: ["/cuddle usuario:@amigo", "hoshi cuddle @amigo"],
    status: "operativa",
  },
  kiss: {
    name: "kiss",
    category: "Interactions",
    purpose: "Manda un besito kawaii a alguien, registrando y contando los besos acumulados en la base de datos.",
    syntax: "/kiss usuario:@miembro",
    prefixSyntax: "hoshi kiss <@usuario|ID|reply> | xkiss",
    options: [
      { name: "usuario", desc: "A quién deseas besar.", required: true, type: "Usuario" },
    ],
    examples: ["/kiss usuario:@pareja", "hoshi kiss @pareja"],
    status: "operativa",
  },
  poke: {
    name: "poke",
    category: "Interactions",
    purpose: "Molesta insistentemente a un miembro con un poke y opción de contraataque interactivo.",
    syntax: "/poke usuario:@miembro",
    prefixSyntax: "hoshi poke <@usuario|ID|reply> | xpoke",
    options: [
      { name: "usuario", desc: "A quién deseas pokear.", required: true, type: "Usuario" },
    ],
    examples: ["/poke usuario:@amigo", "hoshi poke @amigo"],
    status: "operativa",
  },
  pat: {
    name: "pat",
    category: "Interactions",
    purpose: "Acaricia suavemente la cabeza de alguien dándole palmaditas reconfortantes.",
    syntax: "/pat usuario:@miembro",
    prefixSyntax: "hoshi pat <@usuario|ID|reply> | xpat",
    options: [
      { name: "usuario", desc: "A quién deseas darle palmaditas.", required: true, type: "Usuario" },
    ],
    examples: ["/pat usuario:@amigo", "hoshi pat @amigo", "xpat @amigo"],
    status: "operativa",
  },
  slap: {
    name: "slap",
    category: "Interactions",
    purpose: "Dale una cachetada épica a alguien con opción de devolver el golpe.",
    syntax: "/slap usuario:@miembro",
    prefixSyntax: "hoshi slap <@usuario|ID|reply> | xslap",
    options: [
      { name: "usuario", desc: "A quién deseas cachetear.", required: true, type: "Usuario" },
    ],
    examples: ["/slap usuario:@amigo", "hoshi slap @amigo"],
    status: "operativa",
  },
  highfive: {
    name: "highfive",
    category: "Interactions",
    purpose: "Choca los cinco con otro miembro para celebrar momentos destacados.",
    syntax: "/highfive usuario:@miembro",
    prefixSyntax: "hoshi highfive <@usuario|ID|reply> | xhighfive",
    options: [
      { name: "usuario", desc: "Con quién chocar los cinco.", required: true, type: "Usuario" },
    ],
    examples: ["/highfive usuario:@amigo", "hoshi highfive @amigo"],
    status: "operativa",
  },
  bite: {
    name: "bite",
    category: "Interactions",
    purpose: "Pega una mordida juguetona a alguien con posibilidad de morder de vuelta o ponerse a llorar.",
    syntax: "/bite usuario:@miembro",
    prefixSyntax: "hoshi bite <@usuario|ID|reply> | xbite",
    options: [
      { name: "usuario", desc: "A quién deseas morder.", required: true, type: "Usuario" },
    ],
    examples: ["/bite usuario:@amigo", "hoshi bite @amigo"],
    status: "operativa",
  },
  dance: {
    name: "dance",
    category: "Interactions",
    purpose: "Baila en solitario o arrastra a alguien a la pista de baile con música y energía festiva.",
    syntax: "/dance [usuario:@miembro]",
    prefixSyntax: "hoshi dance [@usuario|ID|reply] | xdance",
    options: [
      { name: "usuario", desc: "Con quién bailar (opcional).", required: false, type: "Usuario" },
    ],
    examples: ["/dance", "/dance usuario:@amigo", "hoshi dance @amigo"],
    status: "operativa",
  },
  sad: {
    name: "sad",
    category: "Interactions",
    purpose: "Expresa tristeza o desánimo en el chat recibiendo palabras de apoyo y empatía.",
    syntax: "/sad",
    prefixSyntax: "hoshi sad | xsad",
    examples: ["/sad", "hoshi sad", "xsad"],
    status: "operativa",
  },
  happy: {
    name: "happy",
    category: "Interactions",
    purpose: "Comparte tu alegría y energía positiva con un GIF festivo de celebración.",
    syntax: "/happy",
    prefixSyntax: "hoshi happy | xhappy",
    examples: ["/happy", "hoshi happy", "xhappy"],
    status: "operativa",
  },
  blush: {
    name: "blush",
    category: "Interactions",
    purpose: "Reacciona con sonrojo y ternura ante un cumplido o momento cute.",
    syntax: "/blush",
    prefixSyntax: "hoshi blush | xblush",
    examples: ["/blush", "hoshi blush", "xblush"],
    status: "operativa",
  },
  cry: {
    name: "cry",
    category: "Interactions",
    purpose: "Llora en solitario o consuela a otro miembro con un abrazo reconfortante y mensaje cálido.",
    syntax: "/cry [usuario:@miembro]",
    prefixSyntax: "hoshi cry [@usuario|ID|reply] | xcry",
    options: [
      { name: "usuario", desc: "A quién consolar (opcional).", required: false, type: "Usuario" },
    ],
    examples: ["/cry", "hoshi cry", "hoshi cry @amigo"],
    status: "operativa",
  },
  wave: {
    name: "wave",
    category: "Interactions",
    purpose: "Saluda amistosamente al servidor o a un usuario en particular con la mano.",
    syntax: "/wave [usuario:@miembro]",
    prefixSyntax: "hoshi wave [@usuario|ID|reply] | xwave",
    options: [
      { name: "usuario", desc: "A quién saludar (opcional).", required: false, type: "Usuario" },
    ],
    examples: ["/wave", "hoshi wave @amigo", "xwave"],
    status: "operativa",
  },

  // ================= UTILIDADES DE PREFIJO CLÁSICO =================
  ping: {
    name: "ping",
    category: "Fun",
    purpose: "Mide la latencia de respuesta de los mensajes y la conexión en tiempo real del WebSocket de Discord.",
    syntax: "/ping",
    prefixSyntax: "hoshi ping | xping | h!ping",
    examples: ["/ping", "hoshi ping", "xping"],
    status: "operativa",
  },
  say: {
    name: "say",
    category: "Fun",
    purpose: "Hace que Hoshiko repita un mensaje en el canal (con protección anti-menciones masivas y registro de auditoría).",
    syntax: "/say mensaje:<texto>",
    prefixSyntax: "hoshi say <mensaje> | xsay <mensaje>",
    options: [
      { name: "mensaje", desc: "Texto que dirá el bot.", required: true, type: "Texto" },
    ],
    userPerms: ["Gestionar Mensajes (ManageMessages)"],
    examples: ["/say mensaje:¡Bienvenidos al evento!", "hoshi say ¡Hola a todos!"],
    status: "operativa",
  },
  translate: {
    name: "translate",
    category: "Fun",
    purpose: "Traduce texto o el mensaje al que respondes a múltiples idiomas utilizando la IA de Hoshiko.",
    syntax: "/translate [idioma:es|en|pt...] <texto>",
    prefixSyntax: "hoshi translate [idioma] <texto|reply> | xtranslate",
    options: [
      { name: "texto", desc: "Texto a traducir.", required: true, type: "Texto" },
      { name: "idioma", desc: "Idioma destino.", required: false, type: "Opciones" },
    ],
    examples: ["/translate texto:Hello world", "hoshi translate en Hola mundo", "xtranslate es Bonjour"],
    status: "operativa",
  },
  prefix: {
    name: "prefix",
    category: "Setups",
    purpose: "Consulta o cambia el símbolo con el que responde el bot a los comandos de texto en el servidor.",
    syntax: "/setprefix nuevo:<simbolo>",
    prefixSyntax: "hoshi prefix <nuevo_simbolo> | xprefix <nuevo_simbolo> | xsetprefix",
    aliases: ["setprefix", "cambiarprefijo"],
    options: [
      { name: "nuevo", desc: "Nuevo prefijo para el servidor (máx. 3 caracteres).", required: true, type: "Texto" },
    ],
    userPerms: ["Administrador (Administrator)"],
    examples: ["/setprefix nuevo:!", "hoshi prefix !", "xprefix ."],
    status: "operativa",
  },
  snipe: {
    name: "snipe",
    category: "Fun",
    purpose: "Recupera y muestra el último mensaje eliminado en el canal de texto actual si el módulo está habilitado.",
    syntax: "/snipe",
    prefixSyntax: "hoshi snipe | xsnipe",
    examples: ["/snipe", "hoshi snipe", "xsnipe"],
    status: "operativa",
  },
  afk: {
    name: "afk",
    category: "Information",
    purpose: "Configura tu estado ausente (AFK) con un motivo para avisar automáticamente a quienes te mencionen.",
    syntax: "/afk motivo:<razón>",
    prefixSyntax: "hoshi afk [motivo] | xafk [motivo]",
    options: [
      { name: "motivo", desc: "Razón por la que estarás ausente.", required: false, type: "Texto" },
    ],
    examples: ["/afk motivo:Estudiando para el examen", "hoshi afk Almorzando"],
    status: "operativa",
  },
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
    prefixSyntax: "hoshi serverinfo | xserverinfo | h!serverinfo",
    aliases: ["server", "guildinfo", "svinfo"],
    examples: ["/serverinfo", "hoshi serverinfo", "xserver"],
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
  "dev-servers": {
    name: "dev-servers",
    category: "Owner",
    purpose: "Muestra la lista de servidores activos de Hoshiko en un embed paginado de hasta 50 casitas y archivo .txt detallado.",
    syntax: "/dev-servers [txt:<true|false>]",
    prefixSyntax: "hoshi dev-servers [--txt] | hoshi dev_servers",
    aliases: ["dev_servers", "devservers", "servidores-dev"],
    options: [
      { name: "txt", desc: "Forzar adjuntar el archivo .txt con la lista completa de servidores.", required: false, type: "Booleano" },
    ],
    userPerms: ["Exclusivo para el Desarrollador (BOT_OWNER_ID)"],
    botPerms: ["Ver Canales", "Enviar Mensajes", "Insertar Enlaces", "Adjuntar Archivos"],
    examples: ["/dev-servers", "/dev-servers txt:True", "hoshi dev-servers", "hoshi dev_servers --txt"],
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
    prefixSyntax: typeof slashCmd?.prefixRun === "function"
      ? `hoshi ${name} | x${name}`
      : undefined,
    aliases: Array.isArray(slashCmd?.aliases) ? slashCmd.aliases : undefined,
    examples: subcommands.length > 0
      ? [`/${name} ${subcommands[0].name}`]
      : typeof slashCmd?.prefixRun === "function"
      ? [`/${name}`, `hoshi ${name}`]
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
