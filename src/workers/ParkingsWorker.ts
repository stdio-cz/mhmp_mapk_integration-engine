"use strict";

import TSKParkingsDataSource from "../datasources/TSKParkingsDataSource";
import CustomError from "../helpers/errors/CustomError";
import ParkingsHistModel from "../models/ParkingsHistModel";
import ParkingsModel from "../models/ParkingsModel";
import ParkingsHistPipeline from "../pipelines/ParkingsHistPipeline";
import ParkingsPipeline from "../pipelines/ParkingsPipeline";

const config = require("../../config.js");
const log = require("debug")("data-platform:integration-engine");

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
            throw new CustomError("Transformed data are not valid.", true, 1011);
        } else {
            await this.parkingsModel.SaveToDb(transformedData);
            const removeRes =
                await this.parkingsModel.RemoveOldRecords(config.refreshTimesInMinutes.Parkings);
            if (removeRes.records.length !== 0) {
                log("During the saving data from source to DB the old "
                    + "records was found and removed.");
                log(removeRes);
            }
            return transformedData;
        }
    }

    public saveDataToHistory = async (data: any): Promise<any> => {
        const transformedData = await this.parkingsHistPipeline.TransformDataCollection(data);
        const isValid = await this.parkingsHistModel.Validate(transformedData);
        if (!isValid) {
            throw new CustomError("Transformed data are not valid.", true, 1011);
        } else {
            const savingResult = await this.parkingsHistModel.SaveToDb(transformedData);
            return transformedData;
        }
    }

}
