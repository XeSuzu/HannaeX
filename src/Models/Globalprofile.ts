import { Schema, model, Document } from 'mongoose';
import { LogLevel } from '../Security';

export interface IGlobalProfile extends Document {
    userId: string;

    // --- PROGRESO BASICO ---
    xp: number;
    level: number;
    reputation: number;

    // -- PERSONALIZACION  ---
    // Integrar solo IDs con array una vez construido economia

    unlockedBackgrounds: string[];
    unlockedFrames: string[];

    theme: {
        background: string;
        color: string;
        frameId: string;
    }

    // --META--
    lastXpGain: Date;
    lastReputation: Date;
}

const GlobalProfileSchema = new Schema<IGlobalprofile>({
    userId: { type: String, required: true, unique:true},

    xp: { type: Number, default: 0},
    level: { type: Number, default: 0},
    reputation: { type: Number, default: 0},

    // POr defecto todos default
    unlockedBackgrounds: { type: [String], default: ['default']},
    unlockedFrames: { type: [String], default: ['none']},

    theme : {
        color: { type: String, default: '·ffffff'},
        background: { type: String, default: 'default'},
        frameId: { type: String, default: 'none'}
    },

    lastXpGain: { type: Date, default: Date.now },
    lastReputation: { type: Date, default: Date.now },
});

export default model<IGlobalProfile>('GlobalProfile', GlobalProfileSchema);