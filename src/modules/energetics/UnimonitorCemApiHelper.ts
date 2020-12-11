"use strict";

import { CustomError } from "@golemio/errors";
import { IncomingMessage } from "http";
import * as request from "request-promise";

import { config } from "../../core/config";

/**
 * Helper class for requesting additional data from Unimonitor CEM API
 */
class UnimonitorCemApi {
    // tslint:disable:member-ordering
    public static API_DATE_FORMAT = "YYYY-MM-DD";
    public static API_DATE_TZ = "Europe/Prague";
    private static COOKIE_KV_SEPARATOR = "=";

    /**
     * Create API session and return authorization cookie
     */
    public static createSession = async (): Promise<{ authCookie: string }> => {
        const { url, authCookieName, user, pass } = config.datasources.UnimonitorCemApiEnergetics;
        const params = new URLSearchParams({
            id: UnimonitorCemApi.resourceType.UserLogin,
            pass,
            user,
        });

        const options: request.Options = {
            resolveWithFullResponse: true,
            timeout: 10000,
            url: `${url}?${params}`,
        };

        try {
            const { headers }: IncomingMessage = await request.get(options);
            const cookieHeader = headers["set-cookie"]?.[0];

            return {
                authCookie: UnimonitorCemApi.processAndFilterAuthCookie(cookieHeader, authCookieName),
            };
        } catch (err) {
            throw new CustomError("Cannot retrieve Unimonitor CEM API authorization token", true,
                UnimonitorCemApi.name, 5006, err);
        }
    }

    /**
     * Terminate current session/invalidate auth cookie
     */
    public static terminateSession = async (authCookie: string): Promise<void> => {
        const { url } = config.datasources.UnimonitorCemApiEnergetics;
        const params = new URLSearchParams({
            id: UnimonitorCemApi.resourceType.UserLogout,
        });

        const options: request.Options = {
            headers: {
                Cookie: authCookie,
            },
            timeout: 10000,
            url: `${url}?${params}`,
        };

        try {
            await request.get(options);
        } catch (err) {
            throw new CustomError("Cannot terminate Unimonitor CEM API session", true,
                UnimonitorCemApi.name, 5007, err);
        }
    }

    /**
     * Return resource types/identifiers
     */
    public static get resourceType() {
        return {
            Measurement: "20",
            MeasuringEquipment: "6",
            MeterType: "14",
            TypeMeasuringEquipment: "11",
            Units: "7",
            UserLogin: "4",
            UserLogout: "5",
        };
    }

    /**
     * Process and filter auth cookie from the original cookie header
     */
    private static processAndFilterAuthCookie = (cookieHeader: string | null, authCookieName: string): string => {
        const rawCookies = cookieHeader?.split(";") ?? [];

        for (const rawCookie of rawCookies) {
            const rawCookieArray = rawCookie
                .split(UnimonitorCemApi.COOKIE_KV_SEPARATOR)
                .map((prop) => prop.trim());

            const [cookieName, cookieValue] = rawCookieArray;

            if (cookieName === authCookieName && !!cookieValue) {
                return rawCookieArray.join(UnimonitorCemApi.COOKIE_KV_SEPARATOR);
            }
        }

        return "";
    }
}

export { UnimonitorCemApi };
