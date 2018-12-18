"use strict";

import IceGatewaySensorsDataSource from "../datasources/IceGatewaySensorsDataSource";
import IceGatewaySensorsHistoryModel from "../models/IceGatewaySensorsHistoryModel";
import IceGatewaySensorsModel from "../models/IceGatewaySensorsModel";
import IceGatewaySensorsHistoryTransformation from "../transformations/IceGatewaySensorsHistoryTransformation";
import IceGatewaySensorsTransformation from "../transformations/IceGatewaySensorsTransformation";

export default class IceGatewaySensorsWorker {

    private model: IceGatewaySensorsModel;
    private dataSource: IceGatewaySensorsDataSource;
    private transformation: IceGatewaySensorsTransformation;
    private historyModel: IceGatewaySensorsHistoryModel;
    private historyTransformation: IceGatewaySensorsHistoryTransformation;

    constructor() {
        this.model = new IceGatewaySensorsModel();
        this.dataSource = new IceGatewaySensorsDataSource();
        this.transformation = new IceGatewaySensorsTransformation();
        this.historyModel = new IceGatewaySensorsHistoryModel();
        this.historyTransformation = new IceGatewaySensorsHistoryTransformation();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.dataSource.GetAll();
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
        return transformedData;
    }

    public saveDataToHistory = async (data: any): Promise<any> => {
        const transformedData = await this.historyTransformation.TransformDataCollection(data);
        await this.historyModel.SaveToDb(transformedData);
        return transformedData;
    }

}
