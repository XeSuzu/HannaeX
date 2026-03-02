// src/Models/Globalprofile.ts
import { Schema, model, Document } from "mongoose";

export interface IGlobalProfile extends Document {
  userId: string;

  // --- PROGRESO BÁSICO ---
  xp: number;
  level: number;
  reputation: number;

  // --- PERSONALIZACIÓN ---
  unlockedBackgrounds: string[];
  unlockedFrames: string[];
  theme: {
    background: string;
    color: string;
    frameId: string;
  };

  // --- SNIPE ---
  // Servidores donde ya se le notificó sobre el snipe (DM de primer borrado)
  snipeNotifiedGuilds: string[];

  // --- META ---
  lastXpGain: Date;
  lastReputation: Date;
}

const GlobalProfileSchema = new Schema<IGlobalProfile>({
  userId: { type: String, required: true, unique: true },

  xp:         { type: Number, default: 0 },
  level:      { type: Number, default: 0 },
  reputation: { type: Number, default: 0 },

  unlockedBackgrounds: { type: [String], default: ["default"] },
  unlockedFrames:      { type: [String], default: ["none"] },

  theme: {
    color:      { type: String, default: "#ffffff" },
    background: { type: String, default: "default" },
    frameId:    { type: String, default: "none" },
  },

  snipeNotifiedGuilds: { type: [String], default: [] },

  lastXpGain:    { type: Date, default: Date.now },
  lastReputation: { type: Date, default: Date.now },
});

export default model<IGlobalProfile>("GlobalProfile", GlobalProfileSchema);