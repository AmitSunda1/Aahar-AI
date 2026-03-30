export const ApiTags = {
  ME: "Me",
  DASHBOARD: "Dashboard",
} as const;

export type ApiTag = (typeof ApiTags)[keyof typeof ApiTags];

export const apiTagTypes = Object.values(ApiTags);
