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
    private static readonly COOKIE_KV_SEPARATOR = "=";

    /**
     * Get authorization cookie
     */
    public static getAuthCookie = async (): Promise<string> => {
        const { url, authCookieName, user, pass } = config.datasources.UnimonitorCemApiEnergetics;
        const params = new URLSearchParams({
            id: UnimonitorCemApi.resourceType.UserLogin,
            pass,
            user,
        });

        const options: request.Options = {
            resolveWithFullResponse: true,
            url: `${url}?${params}`,
        };

        try {
            const { headers }: IncomingMessage = await request(options);
            const cookieHeader = headers["set-cookie"]?.[0];

            return UnimonitorCemApi.processAndFilterAuthCookie(cookieHeader, authCookieName);
        } catch (err) {
            throw new CustomError("Cannot retrieve Unimonitor CEM API authorization token", true,
                UnimonitorCemApi.name, 6004, err);
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
