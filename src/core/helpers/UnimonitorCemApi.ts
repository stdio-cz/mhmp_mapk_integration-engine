"use strict";

import { CustomError } from "@golemio/errors";
import { IncomingMessage } from "http";
import * as request from "request-promise";

import { config } from "../config";

/**
 * Helper class for requesting additional data from Unimonitor CEM API
 */
class UnimonitorCemApi {
    /**
     * Get authorization token from Cookie
     */
    public static getAuthToken = async (): Promise<string> => {
        const { url, cookieName, paramsRecord } = config.unimonitorCemApiAuth;
        const options: request.Options = {
            resolveWithFullResponse: true,
            url: `${url}?${new URLSearchParams(paramsRecord)}`,
        };

        try {
            const { headers }: IncomingMessage = await request(options);
            const rawCookieString = headers["set-cookie"]?.[0];

            return UnimonitorCemApi.extractAuthTokenFromHeader(rawCookieString, cookieName);
        } catch (err) {
            throw new CustomError("Cannot retrieve Unimonitor CEM API authorization token", true,
                UnimonitorCemApi.name, 6004, err);
        }
    }

    /**
     * Extract auth token from the raw cookie string (header)
     */
    private static extractAuthTokenFromHeader = (rawCookieString: string | null, authCookieName: string): string => {
        const rawCookieArray = rawCookieString?.split(";") ?? [];

        for (const rawCookie of rawCookieArray) {
            const [cookieName, cookieValue] = rawCookie.split("=").map((prop) => prop.trim());

            if (cookieName === authCookieName) {
                return cookieValue ?? "";
            }
        }

        return "";
    }
}

export { UnimonitorCemApi };
