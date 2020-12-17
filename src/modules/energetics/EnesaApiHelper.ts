"use strict";

type DateParams = {
    [P in "from" | "from_ms" | "to" | "to_ms"]?: string
};

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
            Consumption: "Data/consumption",
            ConsumptionVisapp: "Data/visapp",
            Devices: "devices",
        };
    }
}

export { DateParams, EnesaApi };
