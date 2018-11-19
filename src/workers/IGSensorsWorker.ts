"use strict";

import IGSensorsDataSource from "../datasources/IGSensorsDataSource";
import IGSensorsHistoryModel from "../models/IGSensorsHistoryModel";
import IGSensorsModel from "../models/IGSensorsModel";
import IGSensorsHistoryTransformation from "../transformations/IGSensorsHistoryTransformation";
import IGSensorsTransformation from "../transformations/IGSensorsTransformation";

export default class IGSensorsWorker {

    private model: IGSensorsModel;
    private dataSource: IGSensorsDataSource;
    private pipeline: IGSensorsTransformation;
    private historyModel: IGSensorsHistoryModel;
    private historyTransformation: IGSensorsHistoryTransformation;

    constructor() {
        this.model = new IGSensorsModel();
        this.dataSource = new IGSensorsDataSource();
        this.pipeline = new IGSensorsTransformation();
        this.historyModel = new IGSensorsHistoryModel();
        this.historyTransformation = new IGSensorsHistoryTransformation();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.dataSource.GetAll();
        const transformedData = await this.pipeline.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
        return transformedData;
    }

    public saveDataToHistory = async (data: any): Promise<any> => {
        const transformedData = await this.historyTransformation.TransformDataCollection(data);
        await this.historyModel.SaveToDb(transformedData);
        return transformedData;
    }

}
