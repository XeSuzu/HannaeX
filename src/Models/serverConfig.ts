import { Schema, model, Document } from 'mongoose';

// --- INTERFACES DE SOPORTE ---

interface ICulture {
  vocabulary: Map<string, number>;
  slangs: Array<{ word: string; meaning: string; addedBy: string }>;
  internalJokes: Array<{ trigger: string; response: string; context: string }>;
  emojis: Map<string, number>;
  visualLibrary: Array<{ url: string; context: string; type: string }>; 
}

// NUEVO: Interfaz Auxiliar para roles
interface ILevelRole {
  level: number;
  roleId: string;
}

// NUEVO: Mapa Social
interface ISocialMap {
  targets: Array<{ userId: string; tag: string; reason: string }>;
  trustLevels: Map<string, number>;
}

//  NUEVO: Reglas de Castigo
interface IAutoModRule {
  threshold: number;      // Puntos necesarios (ej: 50)
  action: 'WARN' | 'MUTE' | 'KICK' | 'BAN';
  duration: number;       // En milisegundos (solo para Mute)
}

//  NUEVO: Interruptores de Seguridad
interface ISecurityModules {
  antiSpam: boolean;
  antiLinks: boolean;
  antiRaid: boolean;
  antiNuke: boolean;
}

// --- INTERFAZ PRINCIPAL ---

export interface IServerConfig extends Document {
  guildId: string;

  // Sistema de niveles
  leveling: {
    enabled: boolean;
    xpRate: number; 
    ignoredChannels: string[];
    ignoredRoles: string[];

    levelRoles: ILevelRole[];

    // VENTANA PARA ECONOMIA
    //DESCOMENTAR A FUTURO
    // currencyRewards: [{ level: 10; amount: 500}]
    // moneyMultiplierPerLevel: number

    announceChannel: string | null;
    announceMessage: string;
  }
  
  // Canales
  memeChannelId: string;
  modLogChannel?: string; // NUEVO: Canal de Logs de Seguridad

  // Configuración IA (Legacy + Modern)
  aiMode: 'calmado' | 'libre'; 
  aiSafety: 'relaxed' | 'standard' | 'strict';
  premiumUntil: Date | null; 

  // Sistema Hoshiko 2.0
  aiSystem: {
    mode: 'neko' | 'custom';
    customPersona: string;
    randomChance: number;
    cooldownUntil: Date;
    spontaneousChannels: string[];
  };

  // SEGURIDAD Y AUTOMOD (NUEVO BLOQUE)
  securityModules: ISecurityModules;
  autoModRules: IAutoModRule[];
  infractionsMap: Map<string, number>; // Mapa: ID Usuario -> Puntos Totales

  // Cultura y Memoria
  culture: ICulture;
  socialMap: ISocialMap;
  shortTermMemory: Array<{ content: string; timestamp: Date; participants: string[] }>;
}

// --- SCHEMA MONGOOSE ---

const serverConfigSchema = new Schema<IServerConfig>({
  guildId: { type: String, required: true, unique: true },
  
  // Canales
  memeChannelId: { type: String, default: "" }, 
  modLogChannel: { type: String, default: null }, 

  // IA y Premium
  aiMode: { type: String, enum: ['calmado', 'libre'], default: 'calmado' },
  aiSafety: { type: String, enum: ['relaxed', 'standard', 'strict'], default: 'relaxed' },
  premiumUntil: { type: Date, default: null },

  aiSystem: {
    mode: { type: String, enum: ['neko', 'custom'], default: 'neko' },
    customPersona: { type: String, default: "" }, 
    randomChance: { type: Number, default: 3 }, 
    cooldownUntil: { type: Date, default: Date.now },
    spontaneousChannels: { type: [String], default: [] }
  },

  //  BLOQUE DE SEGURIDAD 
  securityModules: {
    antiSpam: { type: Boolean, default: false },
    antiLinks: { type: Boolean, default: false },
    antiRaid: { type: Boolean, default: false },
    antiNuke: { type: Boolean, default: false }
  },

  autoModRules: {
    type: [{
      threshold: { type: Number, required: true },
      action: { type: String, enum: ['WARN', 'MUTE', 'KICK', 'BAN'], required: true },
      duration: { type: Number, default: 0 }
    }],
    default: [] // Si está vacío, InfractionManager usa las reglas por defecto
  },

  infractionsMap: { 
    type: Map, 
    of: Number,    
    default: new Map() 
  },

  // Cultura
  culture: {
    vocabulary: { type: Map, of: Number, default: new Map() },
    slangs: [{ word: String, meaning: String, addedBy: String }],
    internalJokes: [{ trigger: String, response: String, context: String }],
    emojis: { type: Map, of: Number, default: new Map() },
    visualLibrary: [{ 
        url: String, 
        context: String, 
        type: { type: String, enum: ['gif', 'image'] } 
    }]
  },

  socialMap: {
    targets: [{ userId: String, tag: String, reason: String }],
    trustLevels: { type: Map, of: Number, default: new Map() }
  },

  shortTermMemory: [{
    content: String,
    timestamp: { type: Date, default: Date.now },
    participants: [String]
  }]
});

export default model<IServerConfig>('ServerConfig', serverConfigSchema);