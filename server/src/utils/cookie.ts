import { Response, CookieOptions } from "express";
import { env } from "../config/env.config";

export const ACCESS_TOKEN_EXPIRES_IN = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days

export const getBaseCookieOptions = (): CookieOptions => ({
    httpOnly: true,
    secure: env.NODE_ENV === "production" || env.NODE_ENV === "staging",
    sameSite: env.NODE_ENV === "development" ? "lax" : "none",
});

export const attachCookiesToResponse = (
    res: Response,
    accessToken: string,
    refreshToken?: string
) => {
    const baseOptions = getBaseCookieOptions();

    res.cookie("accessToken", accessToken, {
        ...baseOptions,
        maxAge: ACCESS_TOKEN_EXPIRES_IN,
    });

    if (refreshToken) {
        res.cookie("refreshToken", refreshToken, {
            ...baseOptions,
            maxAge: REFRESH_TOKEN_EXPIRES_IN,
        });
    }
};

export const clearCookiesFromResponse = (res: Response) => {
    const baseOptions = getBaseCookieOptions();
    res.cookie("accessToken", "loggedout", { ...baseOptions, maxAge: 10 });
    res.cookie("refreshToken", "loggedout", { ...baseOptions, maxAge: 10 });
};
