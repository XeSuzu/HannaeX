export const siteConfig = {
  name: "Hoshiko",
  inviteUrl: process.env.NEXT_PUBLIC_HOSHIKO_INVITE_URL ?? "#invitar",
  privacyPath: "/privacidad",
  termsPath: "/terminos",
} as const;
