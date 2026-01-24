// src/Database/Schemas/ViralSetup.ts
import { Schema, model } from 'mongoose';

const viralSetupSchema = new Schema({
    guildId: { type: String, required: true },
    emoji: { type: String, required: true }, // Guardaremos el ID (si es custom) o el emoji (si es normal)
    requiredCount: { type: Number, required: true },
    roleId: { type: String, required: true },
    durationMinutes: { type: Number, default: 0 }
});

export default model('ViralSetup', viralSetupSchema);