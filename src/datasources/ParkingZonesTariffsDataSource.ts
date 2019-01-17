"use strict";

import { ParkingZones } from "data-platform-schema-definitions";
import Validator from "../helpers/Validator";
import CSVDataSource from "./CSVDataSource";
import IDataSource from "./IDataSource";
import ISourceRequest from "./ISourceRequest";

const config = require("../config/ConfigLoader");

export default class ParkingZonesTariffsDataSource extends CSVDataSource implements IDataSource {

    /** The name of the data source. */
    public name: string;
    /** The object which specifies HTTP request. */
    protected sourceRequestObject: ISourceRequest;
    /** Validation helper */
    protected validator: Validator;
    /** csvtojson line transformation */
    protected subscribe: (json: object) => { json: object };
    /** Specifies where to look for the unique identifier of the object to find it in the collection. */
    protected searchPath: string;
    /** Specifies where is the collection of the individual results stored in the returned object. */
    protected resultsPath: string;

    constructor() {
        super();
        this.name = "ParkingZonesTariffsDataSource";
        this.sourceRequestObject = {
            headers: {},
            method: "GET",
            url: config.datasources.ParkingZonesTariffs,
        };
        this.subscribe = (json: any) => {
            json.TIMEFROM = this.timeToMinutes(json.TIMEFROM);
            json.TIMETO = this.timeToMinutes(json.TIMETO);
            delete json.OBJECTID;
            json.code = json.CODE;
            delete json.CODE;
            json.day = json.DAY;
            delete json.DAY;
            json.divisibility = parseInt(json.DIVISIBILITY, 10);
            delete json.DIVISIBILITY;
            json.time_from = json.TIMEFROM;
            delete json.TIMEFROM;
            json.max_parking_time = parseInt(json.MAXPARKINGTIME, 10);
            delete json.MAXPARKINGTIME;
            json.price_per_hour = parseFloat(json.PRICEPERHOUR);
            delete json.PRICEPERHOUR;
            json.time_to = json.TIMETO;
            delete json.TIMETO;
            return json;
        };
        this.validator = new Validator(this.name, ParkingZones.datasourceTariffsMongooseSchemaObject);
        this.resultsPath = "";
        this.searchPath = "";
    }

    /**
     * Convert string time to minutes as number
     */
    private timeToMinutes = (value: string): number => {
        const arr = value.split(":").map((val) => {
            return Number(val);
        });
        return (arr[0] * 60) + arr[1];
    }

}
