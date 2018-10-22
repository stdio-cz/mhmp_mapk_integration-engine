"use strict";

const request = require("request");

/**
 * Helper class for requesting additional data from Google API and OpenStreetMap API.
 */
class GeocodeApi {

    protected googleApiUrl: string;
    protected openStreetMapApiUrl: string;

    constructor() {
        this.googleApiUrl = "https://maps.google.com/maps/api/geocode/json?key=AIzaSyDEB20Wqg_g5N0U45sru3Z58nHX8aGhAMI";
        this.openStreetMapApiUrl = "https://nominatim.openstreetmap.org/reverse?format=json&accept-language=cs&zoom=18";
    }

    /**
     * Gets Address by Coordinates by Google API.
     *
     * @param {number} lat Latitude
     * @param {number} lng Longitude
     */
    public getAddressByLatLngByGoogle = (lat: number, lng: number): Promise<any> => {
        return new Promise((resolve, reject) => {
            request.get(this.googleApiUrl + "&latlng=" + lat + "," + lng + "&language=cs", (err, response, body) => {
                if (!err && response && response.statusCode === 200) {
                    let address = null;
                    const results = JSON.parse(body).results;
                    // results JS Closure
                    const resultsIterator = (i, cb) => {
                        if (results.length === i) {
                            cb();
                            return;
                        }
                        const result = results[i];
                        if (result.geometry.location_type === "ROOFTOP" && result.formatted_address) {
                            address = result.formatted_address;
                            cb();
                            return;
                        } else if (result.geometry.location_type === "GEOMETRIC_CENTER" && result.formatted_address) {
                            address = result.formatted_address;
                        } else if (result.geometry.location_type === "RANGE_INTERPOLATED" && result.formatted_address) {
                            address = result.formatted_address;
                        }
                        setImmediate(resultsIterator.bind(null, i + 1, cb));
                    };
                    resultsIterator(0, () => {
                        resolve(address);
                    });
                } else {
                    reject("Retrieving of the google geocode data failed.");
                }
            });
        });
    }

    /**
     * Gets Address by Coordinates by OpenStreetMap API.
     *
     * @param {number} lat Latitude
     * @param {number} lng Longitude
     */
    public getAddressByLatLngByOSM = (lat: number, lng: number): Promise<any> => {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    "Cache-Control": "no-cache",
                    "Referer": "https://api.mojepraha.eu",
                },
                url: this.openStreetMapApiUrl + "&lat=" + lat + "&lon=" + lng,
            };
            request.get(options, (err, response, body) => {
                if (!err && response && response.statusCode === 200) {
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
                    resolve(address);
                } else {
                    reject("Retrieving of the open street map nominatim data failed.");
                }
            });
        });
    }

    /**
     * Gets City District by Coordinates by Google API.
     * Currently not used.
     * TODO rewrite to Promises
     *
     * @param {number} lat Latitude
     * @param {number} lng Longitude
     * @param {Function} callback Callback function.
     */
    public getDistrictByLatLng(lat: number, lng: number, callback: (district: string) => void): void {
        request.get(this.googleApiUrl + "&latlng=" + lat + "," + lng + "&language=cs", (err, response, body) => {
            let district = "";
            const results = JSON.parse(body).results;
            results.forEach((result) => {
                result.address_components.forEach((component) => {
                    if (component.types.includes("sublocality_level_1")) {
                        district = component.long_name;
                        return district;
                    }
                });
            });
            callback(district);
        });
    }

}

export default new GeocodeApi();
