"use strict";

import IGSensorsDataSource from "../datasources/IGSensorsDataSource";
import IGSensorsHistoryModel from "../models/IGSensorsHistoryModel";
import IGSensorsModel from "../models/IGSensorsModel";
import IGSensorsHistoryPipeline from "../pipelines/IGSensorsHistoryPipeline";
import IGSensorsPipeline from "../pipelines/IGSensorsPipeline";

export default class IGSensorsWorker {

    private model: IGSensorsModel;
    private dataSource: IGSensorsDataSource;
    private pipeline: IGSensorsPipeline;
    private historyModel: IGSensorsHistoryModel;
    private historyPipeline: IGSensorsHistoryPipeline;

    constructor() {
        this.model = new IGSensorsModel();
        this.dataSource = new IGSensorsDataSource();
        this.pipeline = new IGSensorsPipeline();
        this.historyModel = new IGSensorsHistoryModel();
        this.historyPipeline = new IGSensorsHistoryPipeline();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.dataSource.GetAll();
        const transformedData = await this.pipeline.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
        return transformedData;
    }

    public saveDataToHistory = async (data: any): Promise<any> => {
        const transformedData = await this.historyPipeline.TransformDataCollection(data);
        await this.historyModel.SaveToDb(transformedData);
        return transformedData;
    }

}
