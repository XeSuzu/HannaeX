import { Schema, model, Document } from 'mongoose';

// 1. Creamos una "interfaz". Es un contrato que define cómo se ve un documento de configuración.
export interface IServerConfig extends Document {
  guildId: string;
  memeChannelId: string;
}

// 2. Creamos el Schema, usando la interfaz para asegurar que coincidan.
const serverConfigSchema = new Schema<IServerConfig>({
  guildId: { type: String, required: true, unique: true },
  memeChannelId: { type: String, required: true },
});

// 3. Creamos y exportamos el Modelo, que también usará la interfaz.
export default model<IServerConfig>('ServerConfig', serverConfigSchema);