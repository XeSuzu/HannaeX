import type { GLOBAL_TIERS } from "../../Database/leveling/globalLevel.model";

export interface ServerRankData {
  username: string;
  avatarBuffer: Buffer;
  level: number;
  rank: number;
  xpCurrent: number;
  xpNeeded: number;
  progressPercent: number;
  messagesSent: number;
  voiceMinutes: number;
  voiceLevel?: number;
  globalLevel?: number;
  globalRank?: number;
  backgroundTheme?: string;
  customBackgroundBuffer?: Buffer | null;
  customBackgroundUrl?: string | null;
  levelPrefix?: string;
  badgeSubtitle?: string | null;
  panelTopText?: string;
  panelBottomText?: string;
}

export interface VCRankData {
  username: string;
  avatarBuffer: Buffer;
  voiceLevel: number;
  vcRank: number;
  voiceMinutes: number;
  xpCurrent: number;
  xpNeeded: number;
  progressPercent: number;
  backgroundTheme?: string;
  customBackgroundBuffer?: Buffer | null;
  customBackgroundUrl?: string | null;
  levelPrefix?: string;
  badgeSubtitle?: string | null;
  panelTopText?: string;
  panelBottomText?: string;
}

export interface GlobalRankData {
  username: string;
  avatarBuffer: Buffer;
  globalLevel: number;
  globalRank: number;
  totalUsers: number;
  xpCurrent: number;
  xpNeeded: number;
  progressPercent: number;
  totalMessages: number;
  totalVoiceMinutes: number;
  tier: (typeof GLOBAL_TIERS)[0];
}

export interface LevelUpBannerData {
  username: string;
  avatarBuffer: Buffer;
  oldLevel: number;
  newLevel: number;
  guildName: string;
  roleName?: string | null;
  isMilestone?: boolean;
  backgroundTheme?: string;
  customBackgroundBuffer?: Buffer | null;
  levelPrefix?: string;
  title?: string;
  subtitle?: string;
  badgeText?: string;
  footerText?: string;
}
