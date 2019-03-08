"use strict";

import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";

const request = require("request-promise");
const config = require("../config/ConfigLoader");

/**
 * Helper class for requesting additional data from OpenStreetMap API.
 */
class GeocodeApi {

    /**
     * Gets Address by Coordinates by OpenStreetMap API.
     *
     * @param {number} lat Latitude
     * @param {number} lng Longitude
     */
    public getAddressByLatLng = async (lat: number, lng: number): Promise<string> => {
        const options = {
            headers: {
                "Cache-Control": "no-cache",
                "Referer": "https://www.golemio.cz",
            },
            url: config.OPEN_STREET_MAP_API_URL_REVERSE + "&lat=" + lat + "&lon=" + lng,
        };

        try {
            const body = await request(options);
            const resultAddr = JSON.parse(body).address;
            let address = "";

            if (resultAddr.road) {
                address += resultAddr.road;
                if (resultAddr.house_number) {
                    address += " " + resultAddr.house_number;
                }
                address += ", ";
            }
            if (resultAddr.city) {
                if (resultAddr.postcode) {
                    address += resultAddr.postcode + " ";
                }
                address += resultAddr.city;
                if (resultAddr.suburb) {
                    address += "-" + resultAddr.suburb;
                }
                address += ", ";
            }
            address += resultAddr.country;
            return address;
        } catch (err) {
            throw new CustomError("Retrieving of the open street map nominatim data failed.", true,
                this.constructor.name, 1012, err);
        }
    }

    /**
     * Gets Geo by Address by OpenStreetMap API.
     *
     * @param {string} street
     * @param {string} city
     */
    public getGeoByAddress = async (street: string, city: string): Promise<number[]> => {
        const options = {
            headers: {
                "Cache-Control": "no-cache",
                "Referer": "https://www.golemio.cz",
            },
            url: config.OPEN_STREET_MAP_API_URL_SEARCH + "&street=" + encodeURI(street) + "&city=" + encodeURI(city),
        };

        try {
            const body = await request(options);
            const result = JSON.parse(body);
            if (result.length === 0) {
                throw new CustomError("Geo coordinations was not found for address '"
                        + street + ", " + city + "'", true, this.constructor.name, 1016);
            }
            return [ parseFloat(result[0].lon), parseFloat(result[0].lat) ];
        } catch (err) {
            log.error(err);
            throw new CustomError("Retrieving of the open street map nominatim data failed.", true,
                this.constructor.name, 1012, err);
        }
    }

}

export default new GeocodeApi();
