"use strict";

import { ParkingZones } from "data-platform-schema-definitions";
import CSVDataTypeStrategy from "../datasources/CSVDataTypeStrategy";
import DataSource from "../datasources/DataSource";
import HTTPProtocolStrategy from "../datasources/HTTPProtocolStrategy";
import JSONDataTypeStrategy from "../datasources/JSONDataTypeStrategy";
import Validator from "../helpers/Validator";
import MongoModel from "../models/MongoModel";
import ParkingZonesTransformation from "../transformations/ParkingZonesTransformation";
import BaseWorker from "./BaseWorker";

const config = require("../config/ConfigLoader");

export default class ParkingZonesWorker extends BaseWorker {

    private dataSource: DataSource;
    private dataSourceTariffs: DataSource;
    private transformation: ParkingZonesTransformation;
    private model: MongoModel;

    constructor() {
        super();
        const zonesDataType = new JSONDataTypeStrategy({resultsPath: "features"});
        zonesDataType.setFilter((item) => item.properties.TARIFTAB !== null);
        this.dataSource = new DataSource(ParkingZones.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {},
                method: "GET",
                url: config.datasources.ParkingZones,
            }),
            zonesDataType,
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
        this.model = new MongoModel(ParkingZones.name + "Model", {
                identifierPath: "properties.code",
                modelIndexes: [{ geometry : "2dsphere" }],
                mongoCollectionName: ParkingZones.mongoCollectionName,
                outputMongooseSchemaObject: ParkingZones.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.code": { $in: id } }
                    : { "properties.code": id },
                updateValues: (a, b) => {
                    a.properties.name = b.properties.name;
                    a.properties.number_of_places = b.properties.number_of_places;
                    a.properties.payment_link = b.properties.payment_link;
                    a.properties.tariffs = b.properties.tariffs;
                    a.properties.timestamp = b.properties.timestamp;
                    a.properties.type = b.properties.type;
                    a.properties.midpoint = b.properties.midpoint;
                    a.properties.northeast = b.properties.northeast;
                    a.properties.southwest = b.properties.southwest;
                    a.properties.zps_id = b.properties.zps_id;
                    a.properties.zps_ids = b.properties.zps_ids;
                    return a;
                },
            },
            new Validator(ParkingZones.name + "ModelValidator", ParkingZones.outputMongooseSchemaObject),
        );
        this.transformation = new ParkingZonesTransformation();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        await this.transformation.setTariffs(await this.dataSourceTariffs.getAll());
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);
    }

    private timeToMinutes = (value: string): number => {
        const arr = value.split(":").map((val) => {
            return Number(val);
        });
        return (arr[0] * 60) + arr[1];
    }

}
