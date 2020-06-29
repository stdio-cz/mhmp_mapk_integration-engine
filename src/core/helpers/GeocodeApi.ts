"use strict";

import { CustomError } from "@golemio/errors";
import { config } from "../config";
import { log } from "./";

import request = require("request-promise");

interface IPostalAddress {
    address_formatted: string;
    street_address?: string;
    postal_code?: string;
    address_locality?: string;
    address_region?: string;
    address_country: string;
}

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
    public getAddressByLatLng = async (lat: number, lng: number): Promise<IPostalAddress> => {
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
            let address = {
                address_country: "",
                address_formatted: "",
            };

            if (resultAddr.road) {
                let streetAddress = resultAddr.road;
                if (resultAddr.house_number) {
                    streetAddress += " " + resultAddr.house_number;
                }
                address.address_formatted += streetAddress + ", ";
                address = { ...address, ...{ street_address: streetAddress } };
            }
            if (resultAddr.city) {
                if (resultAddr.postcode) {
                    address.address_formatted += resultAddr.postcode + " ";
                    address = { ...address, ...{ postal_code: resultAddr.postcode } };
                }
                address.address_formatted += resultAddr.city;
                address = { ...address, ...{ address_locality: resultAddr.city } };
                if (resultAddr.suburb) {
                    address.address_formatted += "-" + resultAddr.suburb;
                    address = { ...address, ...{ address_region: resultAddr.suburb } };
                }
                address.address_formatted += ", ";
            }
            address.address_formatted += resultAddr.country;
            address.address_country = resultAddr.country;
            return address;
        } catch (err) {
            throw new CustomError("Retrieving of the open street map nominatim data failed.", true,
                this.constructor.name, 6002, err);
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
                throw new CustomError("Geo coordinations was not found for address: '"
                    + street + ", " + city + "'", true, this.constructor.name, 5001);
            }
            return [parseFloat(result[0].lon), parseFloat(result[0].lat)];
        } catch (err) {
            log.error(err);
            throw new CustomError("Retrieving of the open street map nominatim data failed.", true,
                this.constructor.name, 6002, err);
        }
    }

}

const geocodeApi = new GeocodeApi();

export { geocodeApi as GeocodeApi };
