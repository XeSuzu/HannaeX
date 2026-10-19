import { Events, VoiceState } from "discord.js";
import { handleVoiceStateChange } from "./handlers/voice/voiceLifecycle";

export {
  initVoiceSessionClient,
  rehydrateVoiceSessions,
} from "./handlers/voice/voiceManager";

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
    await handleVoiceStateChange(oldState, newState);
  },
};
