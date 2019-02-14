"use strict";

import IceGatewayStreetLampsDataSource from "../datasources/IceGatewayStreetLampsDataSource";
import ISourceRequest from "../datasources/ISourceRequest";
import CustomError from "../helpers/errors/CustomError";
import IceGatewayStreetLampsModel from "../models/IceGatewayStreetLampsModel";
import IceGatewayStreetLampsTransformation from "../transformations/IceGatewayStreetLampsTransformation";
import BaseWorker from "./BaseWorker";

const request = require("request-promise");
const config = require("../config/ConfigLoader");

export default class IceGatewayStreetLampsWorker extends BaseWorker {

    private model: IceGatewayStreetLampsModel;
    private dataSource: IceGatewayStreetLampsDataSource;
    private transformation: IceGatewayStreetLampsTransformation;

    constructor() {
        super();
        this.model = new IceGatewayStreetLampsModel();
        this.dataSource = new IceGatewayStreetLampsDataSource();
        this.transformation = new IceGatewayStreetLampsTransformation();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.GetAll();
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
    }

    public setDimValue = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        try {
            const requestObject: ISourceRequest = {
                body: {
                    value: inputData.value,
                },
                headers : {
                    "Authorization": "Token " + config.datasources.IGToken,
                    "Cache-Control": "no-cache",
                    "Content-Type": "application/json",
                },
                json: true,
                method: "POST",
                url: config.datasources.IGStreetLamp + inputData.id + "/",
            };
            await request(requestObject);
        } catch (err) {
            throw new CustomError("Error while sending the POST request.", true, this.constructor.name, 1018, err);
        }
    }
}
