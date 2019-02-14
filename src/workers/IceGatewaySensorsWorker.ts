"use strict";

import { IceGatewaySensors } from "data-platform-schema-definitions";
import IceGatewaySensorsDataSource from "../datasources/IceGatewaySensorsDataSource";
import IceGatewaySensorsHistoryModel from "../models/IceGatewaySensorsHistoryModel";
import IceGatewaySensorsModel from "../models/IceGatewaySensorsModel";
import IceGatewaySensorsHistoryTransformation from "../transformations/IceGatewaySensorsHistoryTransformation";
import IceGatewaySensorsTransformation from "../transformations/IceGatewaySensorsTransformation";
import BaseWorker from "./BaseWorker";

const config = require("../config/ConfigLoader");

export default class IceGatewaySensorsWorker extends BaseWorker {

    private model: IceGatewaySensorsModel;
    private dataSource: IceGatewaySensorsDataSource;
    private transformation: IceGatewaySensorsTransformation;
    private historyModel: IceGatewaySensorsHistoryModel;
    private historyTransformation: IceGatewaySensorsHistoryTransformation;
    private queuePrefix: string;

    constructor() {
        super();
        this.model = new IceGatewaySensorsModel();
        this.dataSource = new IceGatewaySensorsDataSource();
        this.transformation = new IceGatewaySensorsTransformation();
        this.historyModel = new IceGatewaySensorsHistoryModel();
        this.historyTransformation = new IceGatewaySensorsHistoryTransformation();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + IceGatewaySensors.name.toLowerCase();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.GetAll();
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);

        // send message for historization
        await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToHistory",
            new Buffer(JSON.stringify(transformedData.features)), { persistent: true });
    }

    public saveDataToHistory = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.historyTransformation.TransformDataCollection(inputData);
        await this.historyModel.SaveToDb(transformedData);
    }

}
