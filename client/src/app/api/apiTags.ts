
export const ApiTags = {
    ME: "Me",
} as const;

export type ApiTag = typeof ApiTags[keyof typeof ApiTags];

export const apiTagTypes = Object.values(ApiTags);
