"use strict";

import IGSensorsDataSource from "../datasources/IGSensorsDataSource";
import CustomError from "../helpers/errors/CustomError";
import IGSensorsHistModel from "../models/IGSensorsHistModel";
import IGSensorsModel from "../models/IGSensorsModel";
import IGSensorsHistPipeline from "../pipelines/IGSensorsHistPipeline";
import IGSensorsPipeline from "../pipelines/IGSensorsPipeline";

export default class IGSensorsWorker {

    private igsensorsModel: IGSensorsModel;
    private igsensorsDataSource: IGSensorsDataSource;
    private igsensorsPipeline: IGSensorsPipeline;
    private igsensorsHistModel: IGSensorsHistModel;
    private igsensorsHistPipeline: IGSensorsHistPipeline;

    constructor() {
        this.igsensorsModel = new IGSensorsModel();
        this.igsensorsDataSource = new IGSensorsDataSource();
        this.igsensorsPipeline = new IGSensorsPipeline();
        this.igsensorsHistModel = new IGSensorsHistModel();
        this.igsensorsHistPipeline = new IGSensorsHistPipeline();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.igsensorsDataSource.GetAll();
        const transformedData = await this.igsensorsPipeline.TransformDataCollection(data);
        const isValid = await this.igsensorsModel.Validate(transformedData);
        if (!isValid) {
            throw new CustomError("Transformed data are not valid.", true, 1011);
        } else {
            await this.igsensorsModel.SaveToDb(transformedData);
            return transformedData;
        }
    }

    public saveDataToHistory = async (data: any): Promise<any> => {
        const transformedData = await this.igsensorsHistPipeline.TransformDataCollection(data);
        const isValid = await this.igsensorsHistModel.Validate(transformedData);
        if (!isValid) {
            throw new CustomError("Transformed data are not valid.", true, 1011);
        } else {
            await this.igsensorsHistModel.SaveToDb(transformedData);
            return transformedData;
        }
    }

}
