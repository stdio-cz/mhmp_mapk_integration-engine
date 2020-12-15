"use strict";

/**
 * Helper class for Enesa API
 */
class EnesaApi {
    public static API_DATE_FORMAT = "YYYY-MM-DD";
    public static API_DATE_TZ = "Europe/Prague";

    /**
     * Return resource types/identifiers
     */
    public static get resourceType() {
        return {
            Buildings: "buildings/full",
            Devices: "devices",
        };
    }
}

export { EnesaApi };
