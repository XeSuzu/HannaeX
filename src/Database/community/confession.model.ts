import { Document, Model, Schema, model, models } from "mongoose";

export interface IConfession extends Document {
  guildId: string;
  confessionId: number; // El famoso #345

  // 🕵️‍♂️ DATOS PRIVADOS (Evidencia)
  authorId: string;
  authorTag: string; // Snapshot del nombre en ese momento

  // 📝 CONTENIDO
  content: string;
  imageUrl: string | null;

  // 👇 NUEVOS CAMPOS (Para sistema de Foro/Público)
  isAnonymous: boolean; // true = Anónimo (Default), false = Muestra Nombre
  replyToId: number | null; // Si es respuesta, aquí va el ID original (ej: 345)

  // 🔗 RASTREO (Ids de mensaje de Discord)
  channelId?: string | null;
  publicMessageId: string | null;
  logMessageId: string | null;

  // 🛡️ METADATA
  timestamp: Date;
  isDeleted: boolean;
}

const confessionSchema = new Schema<IConfession>({
  guildId: { type: String, required: true },
  confessionId: { type: Number, required: true },

  authorId: { type: String, required: true },
  authorTag: { type: String, required: true },

  content: { type: String, required: true },
  imageUrl: { type: String, default: null },

  // Configuración por defecto: Anónimo y Nueva Publicación
  isAnonymous: { type: Boolean, default: true },
  replyToId: { type: Number, default: null },

  channelId: { type: String, default: null },
  publicMessageId: { type: String, default: null },
  logMessageId: { type: String, default: null },

  timestamp: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
});

// ⚡ OPTIMIZACIÓN: Búsqueda ultra-rápida y evita duplicados
confessionSchema.index({ guildId: 1, confessionId: 1 }, { unique: true });

export const Confession: Model<IConfession> =
  (models.Confession as Model<IConfession>) ||
  model<IConfession>("Confession", confessionSchema);

export default Confession;
