"use strict";

import IceGatewayStreetLampsDataSource from "../datasources/IceGatewayStreetLampsDataSource";
import ISourceRequest from "../datasources/ISourceRequest";
import CustomError from "../helpers/errors/CustomError";
import IceGatewayStreetLampsModel from "../models/IceGatewayStreetLampsModel";
import IceGatewayStreetLampsTransformation from "../transformations/IceGatewayStreetLampsTransformation";

const request = require("request-promise");
const config = require("../config/ConfigLoader");

export default class IceGatewayStreetLampsWorker {

    private model: IceGatewayStreetLampsModel;
    private dataSource: IceGatewayStreetLampsDataSource;
    private transformation: IceGatewayStreetLampsTransformation;

    constructor() {
        this.model = new IceGatewayStreetLampsModel();
        this.dataSource = new IceGatewayStreetLampsDataSource();
        this.transformation = new IceGatewayStreetLampsTransformation();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.dataSource.GetAll();
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
        return transformedData;
    }

    public setDimValue = async (inputData): Promise<any> => {
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

            const body = await request(requestObject);

            return body;
        } catch (err) {
            throw new CustomError("Error while sending the POST request.", true, this.constructor.name, 1018, err);
        }
    }
}
