import { Schema, model, Document } from 'mongoose';

// 🛠️ Sub-esquema para las acciones automáticas (Tu base original)
interface IAutoAction extends Document {
  points: number;
  action: 'timeout' | 'kick' | 'ban';
  duration?: number; 
}

const autoActionSchema = new Schema<IAutoAction>({
  points: { type: Number, required: true },
  action: { type: String, enum: ['timeout', 'kick', 'ban'], required: true },
  duration: { type: Number, required: false }, 
});

// 🛡️ Interfaz principal extendida con las funciones "Excéntricas"
interface IGuildConfig extends Document {
  guildId: string;
  modLogChannel?: string;
  
  // Tu sistema de puntos
  autoActions: IAutoAction[];

  // 🛡️ Módulos de Seguridad a nivel de servidor
  securityModules: {
    antiRaid: boolean;
    antiNuke: boolean;
    honeypotChannel?: string; // El canal trampa que ideamos
    aiModeration: boolean;    // Control por IA (Gemini)
  };

  // 🌍 Conexión con el Staff de Hoshiko
  globalBlacklistEnabled: boolean; // ¿Confía el server en tu lista global?
  
  // Configuración de visualización
  language: 'es' | 'en';
}

const guildConfigSchema = new Schema<IGuildConfig>({
  guildId: { type: String, required: true, unique: true },
  modLogChannel: { type: String, required: false },
  
  // Registro de acciones por puntos
  autoActions: { type: [autoActionSchema], default: [] },

  // Módulos de defensa proactiva
  securityModules: {
    antiRaid: { type: Boolean, default: false },
    antiNuke: { type: Boolean, default: false },
    honeypotChannel: { type: String, default: null },
    aiModeration: { type: Boolean, default: false },
  },

  // Integración con la red Sentinel
  globalBlacklistEnabled: { type: Boolean, default: true },
  
  language: { type: String, enum: ['es', 'en'], default: 'es' }
});

// Exportamos el modelo para que Hoshiko lo use en todo el bot
export default model<IGuildConfig>('GuildConfig', guildConfigSchema);