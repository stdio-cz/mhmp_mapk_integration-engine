"use strict";

import { ParkingZones } from "data-platform-schema-definitions";
import CSVDataTypeStrategy from "../datasources/CSVDataTypeStrategy";
import DataSource from "../datasources/DataSource";
import HTTPProtocolStrategy from "../datasources/HTTPProtocolStrategy";
import JSONDataTypeStrategy from "../datasources/JSONDataTypeStrategy";
import Validator from "../helpers/Validator";
import ParkingZonesModel from "../models/ParkingZonesModel";
import ParkingZonesTransformation from "../transformations/ParkingZonesTransformation";
import BaseWorker from "./BaseWorker";

const config = require("../config/ConfigLoader");

export default class ParkingZonesWorker extends BaseWorker {

    private model: ParkingZonesModel;
    private dataSource: DataSource;
    private dataSourceTariffs: DataSource;
    private transformation: ParkingZonesTransformation;

    constructor() {
        super();
        const zonesProtocol = new JSONDataTypeStrategy({resultsPath: "features"});
        zonesProtocol.setFilter((item) => item.properties.TARIFTAB !== null);
        this.dataSource = new DataSource(ParkingZones.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {},
                method: "GET",
                url: config.datasources.ParkingZones,
            }),
            zonesProtocol,
            new Validator(ParkingZones.name + "DataSource", ParkingZones.datasourceMongooseSchemaObject));
        this.dataSourceTariffs = new DataSource("ParkingZonesTariffsDataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.ParkingZonesTariffs,
            }),
            new CSVDataTypeStrategy({
                csvtojsonParams: { noheader: false },
                subscribe: (json: any) => {
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
                },
            }),
            new Validator("ParkingZonesTariffsDataSource", ParkingZones.datasourceTariffsMongooseSchemaObject));
        this.model = new ParkingZonesModel();
        this.transformation = new ParkingZonesTransformation();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        await this.transformation.setTariffs(await this.dataSourceTariffs.getAll());
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
    }

    private timeToMinutes = (value: string): number => {
        const arr = value.split(":").map((val) => {
            return Number(val);
        });
        return (arr[0] * 60) + arr[1];
    }

}
