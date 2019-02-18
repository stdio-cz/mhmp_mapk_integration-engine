"use strict";

import { Parkings } from "data-platform-schema-definitions";
import DataSource from "../datasources/DataSource";
import HTTPProtocolStrategy from "../datasources/HTTPProtocolStrategy";
import JSONDataTypeStrategy from "../datasources/JSONDataTypeStrategy";
import CustomError from "../helpers/errors/CustomError";
import GeocodeApi from "../helpers/GeocodeApi";
import Validator from "../helpers/Validator";
import CityDistrictsModel from "../models/CityDistrictsModel";
import ParkingsHistoryModel from "../models/ParkingsHistoryModel";
import ParkingsModel from "../models/ParkingsModel";
import ParkingsHistoryTransformation from "../transformations/ParkingsHistoryTransformation";
import ParkingsTransformation from "../transformations/ParkingsTransformation";
import BaseWorker from "./BaseWorker";

const config = require("../config/ConfigLoader");

export default class ParkingsWorker extends BaseWorker {

    private model: ParkingsModel;
    private dataSource: DataSource;
    private transformation: ParkingsTransformation;
    private historyModel: ParkingsHistoryModel;
    private historyTransformation: ParkingsHistoryTransformation;
    private queuePrefix: string;
    private cityDistrictsModel: CityDistrictsModel;

    constructor() {
        super();
        this.model = new ParkingsModel();
        this.dataSource = new DataSource(Parkings.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {},
                method: "GET",
                url: config.datasources.TSKParkings,
            }),
            new JSONDataTypeStrategy({resultsPath: "results"}),
            new Validator(Parkings.name + "DataSource", Parkings.datasourceMongooseSchemaObject));
        this.transformation = new ParkingsTransformation();
        this.historyModel = new ParkingsHistoryModel();
        this.historyTransformation = new ParkingsHistoryTransformation();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + Parkings.name.toLowerCase();
        this.cityDistrictsModel = new CityDistrictsModel();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);

        // send message for historization
        await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToHistory",
            new Buffer(JSON.stringify(transformedData.features)), { persistent: true });

        // send messages for updating district and address and average occupancy
        const promises = transformedData.features.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateAddressAndDistrict",
                new Buffer(JSON.stringify(p)));
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateAverageOccupancy",
                new Buffer(JSON.stringify(p)));
        });
        await Promise.all(promises);
    }

    public saveDataToHistory = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.historyTransformation.TransformDataCollection(inputData);
        await this.historyModel.SaveToDb(transformedData);
    }

    public updateAddressAndDistrict = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const id = inputData.properties.id;
        const dbData = await this.model.GetOneFromModel(id);

        if (!dbData.properties.district
            || inputData.geometry.coordinates[0] !== dbData.geometry.coordinates[0]
            || inputData.geometry.coordinates[1] !== dbData.geometry.coordinates[1]) {
            try {
                const result = await this.cityDistrictsModel.GetDistrictByCoordinations(dbData.geometry.coordinates);
                dbData.properties.district = result;
                await dbData.save();
            } catch (err) {
                throw new CustomError("Error while updating district.", true, this.constructor.name, 1015, err);
            }
        }

        if (!dbData.properties.address
            || inputData.geometry.coordinates[0] !== dbData.geometry.coordinates[0]
            || inputData.geometry.coordinates[1] !== dbData.geometry.coordinates[1]) {
            try {
                const address = await GeocodeApi.getAddressByLatLng(dbData.geometry.coordinates[1],
                    dbData.geometry.coordinates[0]);
                dbData.properties.address = address;
                await dbData.save();
            } catch (err) {
                throw new CustomError("Error while updating adress.", true, this.constructor.name, 1016, err);
            }
        }
        return dbData;
    }

    public updateAverageOccupancy = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const id = inputData.properties.id;
        const dbData = await this.model.GetOneFromModel(id);

        try {
            const result = await this.historyModel.GetAverageTakenPlacesById(id);
            dbData.properties.average_occupancy = result;
            await dbData.save();
        } catch (err) {
            throw new CustomError("Error while updating average taken places.",
                true, this.constructor.name, 1019, err);
        }
    }
}
