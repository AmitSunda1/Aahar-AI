"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCookiesFromResponse = exports.attachCookiesToResponse = exports.getBaseCookieOptions = exports.REFRESH_TOKEN_EXPIRES_IN = exports.ACCESS_TOKEN_EXPIRES_IN = void 0;
const env_config_1 = require("../config/env.config");
exports.ACCESS_TOKEN_EXPIRES_IN = 15 * 60 * 1000; // 15 minutes
exports.REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days
const getBaseCookieOptions = () => ({
    httpOnly: true,
    secure: env_config_1.env.NODE_ENV === "production" || env_config_1.env.NODE_ENV === "staging",
    sameSite: env_config_1.env.NODE_ENV === "development" ? "lax" : "none",
});
exports.getBaseCookieOptions = getBaseCookieOptions;
const attachCookiesToResponse = (res, accessToken, refreshToken) => {
    const baseOptions = (0, exports.getBaseCookieOptions)();
    res.cookie("accessToken", accessToken, {
        ...baseOptions,
        maxAge: exports.ACCESS_TOKEN_EXPIRES_IN,
    });
    if (refreshToken) {
        res.cookie("refreshToken", refreshToken, {
            ...baseOptions,
            maxAge: exports.REFRESH_TOKEN_EXPIRES_IN,
        });
    }
};
exports.attachCookiesToResponse = attachCookiesToResponse;
const clearCookiesFromResponse = (res) => {
    const baseOptions = (0, exports.getBaseCookieOptions)();
    res.cookie("accessToken", "loggedout", { ...baseOptions, maxAge: 10 });
    res.cookie("refreshToken", "loggedout", { ...baseOptions, maxAge: 10 });
};
exports.clearCookiesFromResponse = clearCookiesFromResponse;
