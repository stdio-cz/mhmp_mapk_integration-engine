"use strict";

import TSKParkingsDataSource from "../datasources/TSKParkingsDataSource";
import ParkingsHistModel from "../models/ParkingsHistModel";
import ParkingsModel from "../models/ParkingsModel";
import ParkingsHistPipeline from "../pipelines/ParkingsHistPipeline";
import ParkingsPipeline from "../pipelines/ParkingsPipeline";

const config = require("../../config.js");
const log = require("debug")("ParkingsWorker");
const errorLog = require("debug")("error");

export default class ParkingsWorker {

    private parkingsModel: ParkingsModel;
    private parkingsDataSource: TSKParkingsDataSource;
    private parkingsPipeline: ParkingsPipeline;
    private parkingsHistModel: ParkingsHistModel;
    private parkingsHistPipeline: ParkingsHistPipeline;

    constructor() {
        this.parkingsModel = new ParkingsModel();
        this.parkingsDataSource = new TSKParkingsDataSource();
        this.parkingsPipeline = new ParkingsPipeline();
        this.parkingsHistModel = new ParkingsHistModel();
        this.parkingsHistPipeline = new ParkingsHistPipeline();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.parkingsDataSource.GetAll();
        const transformedData = await this.parkingsPipeline.TransformDataCollection(data);
        const isValid = await this.parkingsModel.Validate(transformedData);
        if (!isValid) {
            throw new Error("ParkingsWorker::refreshDataInDB Source data are not valid.");
        } else {
            return this.parkingsModel.SaveToDb(transformedData)
                .then(async (savingResult) => {
                    const removeRes =
                        await this.parkingsModel.RemoveOldRecords(config.refreshTimesInMinutes.Parkings);
                    if (removeRes.records.length !== 0) {
                        log("During the saving data from source to DB the old "
                            + "records was found and removed.");
                        log(removeRes);
                    }
                    return transformedData;
                }).catch((err) => {
                    errorLog(err);
                    throw new Error("ParkingsWorker::refreshDataInDB Error");
                });
        }
    }

    public saveDataToHistory = async (data: any): Promise<any> => {
        const transformedData = await this.parkingsHistPipeline.TransformDataCollection(data);
        const isValid = await this.parkingsHistModel.Validate(transformedData);
        if (!isValid) {
            throw new Error("ParkingsWorker::saveDataToHistory Source data are not valid.");
        } else {
            return this.parkingsHistModel.SaveToDb(transformedData)
                .then(async (savingResult) => {
                    return transformedData;
                }).catch((err) => {
                    errorLog(err);
                    throw new Error("ParkingsWorker::saveDataToHistory Error");
                });
        }
    }

}
