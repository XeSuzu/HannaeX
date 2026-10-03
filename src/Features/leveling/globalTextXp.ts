import { Message } from "discord.js";
import GlobalLevel, {
  getTierForLevel,
  globalTotalXpForLevel,
} from "../../Models/GlobalLevel";
import LocalLevel from "../../Models/LocalLevels";
import { getCurrentWeekStart } from "./xpRules";
import {
  announceAchievements,
  announceGlobalLevelUp,
  announceGlobalTierUp,
} from "./announcements";

export async function handleGlobalXp(
  message: Message,
  localXpEarned: number,
  isAbuse: boolean = false,
): Promise<void> {
  const userId = message.author.id;
  const now = new Date();

  let globalProfile = await GlobalLevel.findOne({ userId });
  const isNewGlobalProfile = !globalProfile;

  if (!globalProfile) {
    globalProfile = await GlobalLevel.create({
      userId,
      globalXp: 0,
      globalLevel: 0,
      totalMessages: 0,
      serversJoined: 1,
      achievements: [],
      currentTier: "mihon",
      globalStreak: 0,
      lastGlobalXpGain: now,
      weeklyXp: 0,
      weeklyMessages: 0,
      weekStartDate: new Date(0),
    });
  }

  if (!isNewGlobalProfile) {
    const localProfile = await LocalLevel.findOne({
      userId,
      guildId: message.guild?.id,
    });
    if (!localProfile) {
      await GlobalLevel.updateOne({ userId }, { $inc: { serversJoined: 1 } });
      globalProfile.serversJoined += 1;
    }
  }

  let globalXpEarned = Math.max(1, Math.floor(localXpEarned * 0.3));

  if (isAbuse) {
    const cooldownUntil = new Date(now.getTime() + 5 * 60 * 1000);
    await GlobalLevel.updateOne(
      { userId },
      { abuseCooldownUntil: cooldownUntil },
    );
    globalXpEarned = 0;
  }

  const newGlobalXp = globalProfile.globalXp + globalXpEarned;
  let newGlobalLevel = globalProfile.globalLevel;

  while (newGlobalXp >= globalTotalXpForLevel(newGlobalLevel + 1)) {
    newGlobalLevel++;
  }

  const leveledUpGlobal = newGlobalLevel > globalProfile.globalLevel;
  const oldGlobalLevel = globalProfile.globalLevel;

  const oldTier = getTierForLevel(oldGlobalLevel);
  const newTier = getTierForLevel(newGlobalLevel);
  const tierUp = newTier.tier !== oldTier.tier;

  const currentWeekStart = getCurrentWeekStart();
  const previousWeekStart = globalProfile.weekStartDate ?? new Date(0);

  let weeklyXp: number;
  let weeklyMessages: number;

  if (previousWeekStart < currentWeekStart) {
    weeklyXp = globalXpEarned;
    weeklyMessages = 1;
  } else {
    weeklyXp = (globalProfile.weeklyXp ?? 0) + globalXpEarned;
    weeklyMessages = (globalProfile.weeklyMessages ?? 0) + 1;
  }

  const lastGain = globalProfile.lastGlobalXpGain ?? new Date(0);
  const hoursSinceLast =
    (now.getTime() - lastGain.getTime()) / (1000 * 60 * 60);

  let newStreak = globalProfile.globalStreak ?? 0;
  if (hoursSinceLast >= 20 && hoursSinceLast <= 48) {
    newStreak += 1;
  } else if (hoursSinceLast > 48) {
    newStreak = 1;
  }

  const achievements = [...globalProfile.achievements];
  const newAchievements = checkAchievements(
    {
      ...globalProfile.toObject(),
      serversJoined: globalProfile.serversJoined,
      globalStreak: newStreak,
    },
    message,
    newGlobalLevel,
  );

  for (const ach of newAchievements) {
    if (!achievements.includes(ach)) {
      achievements.push(ach);
    }
  }

  await GlobalLevel.updateOne(
    { userId },
    {
      globalXp: newGlobalXp,
      globalLevel: newGlobalLevel,
      $inc: { totalMessages: 1 },
      currentTier: newTier.tier,
      lastGlobalXpGain: now,
      globalStreak: newStreak,
      weeklyXp,
      weeklyMessages,
      weekStartDate: currentWeekStart,
      ...(newAchievements.length > 0 && { achievements }),
    },
  );

  if (newAchievements.length > 0) {
    await announceAchievements(message.author, newAchievements);
  }

  if (leveledUpGlobal) {
    await announceGlobalLevelUp(
      message.author,
      oldGlobalLevel,
      newGlobalLevel,
      newTier,
    );
  }

  if (tierUp) {
    await announceGlobalTierUp(message.author, newTier);
  }
}

function checkAchievements(
  profile: any,
  message: Message,
  newLevel: number,
): string[] {
  const newAchievements: string[] = [];

  if (newLevel >= 1 && !profile.achievements.includes("first_level"))
    newAchievements.push("first_level");
  if (newLevel >= 10 && !profile.achievements.includes("level_10"))
    newAchievements.push("level_10");
  if (newLevel >= 50 && !profile.achievements.includes("level_50"))
    newAchievements.push("level_50");
  if (newLevel >= 100 && !profile.achievements.includes("level_100"))
    newAchievements.push("level_100");

  if (
    profile.totalMessages + 1 >= 1000 &&
    !profile.achievements.includes("messages_1k")
  )
    newAchievements.push("messages_1k");

  if (
    profile.totalMessages + 1 >= 10000 &&
    !profile.achievements.includes("messages_10k")
  )
    newAchievements.push("messages_10k");

  if (
    profile.serversJoined >= 2 &&
    !profile.achievements.includes("multi_server")
  )
    newAchievements.push("multi_server");

  if (
    (profile.globalStreak ?? 0) >= 7 &&
    !profile.achievements.includes("streak_7")
  )
    newAchievements.push("streak_7");

  if (
    (profile.globalStreak ?? 0) >= 30 &&
    !profile.achievements.includes("streak_30")
  )
    newAchievements.push("streak_30");

  return newAchievements;
}
