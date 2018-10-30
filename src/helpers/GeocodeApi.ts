"use strict";

import CustomError from "../helpers/errors/CustomError";

const request = require("request-promise");
const config = require("../../config");

/**
 * Helper class for requesting additional data from Google API and OpenStreetMap API.
 */
class GeocodeApi {

    /**
     * Gets Address by Coordinates by OpenStreetMap API.
     *
     * @param {number} lat Latitude
     * @param {number} lng Longitude
     */
    public getAddressByLatLng = async (lat: number, lng: number): Promise<any> => {
        const options = {
            headers: {
                "Cache-Control": "no-cache",
                "Referer": "https://www.golemio.cz",
            },
            url: config.openStreetMapApiUrl + "&lat=" + lat + "&lon=" + lng,
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
            throw new CustomError("Retrieving of the open street map nominatim data failed.", true, 1012, err);
        }
    }

}

export default new GeocodeApi();
