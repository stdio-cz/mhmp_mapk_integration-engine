"use strict";

import { IceGatewayStreetLamps } from "data-platform-schema-definitions";
import DataSource from "../datasources/DataSource";
import HTTPProtocolStrategy from "../datasources/HTTPProtocolStrategy";
import { IHTTPSettings } from "../datasources/IProtocolStrategy";
import JSONDataTypeStrategy from "../datasources/JSONDataTypeStrategy";
import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";
import IceGatewayStreetLampsModel from "../models/IceGatewayStreetLampsModel";
import IceGatewayStreetLampsTransformation from "../transformations/IceGatewayStreetLampsTransformation";
import BaseWorker from "./BaseWorker";

const request = require("request-promise");
const config = require("../config/ConfigLoader");

export default class IceGatewayStreetLampsWorker extends BaseWorker {

    private model: IceGatewayStreetLampsModel;
    private dataSource: DataSource;
    private transformation: IceGatewayStreetLampsTransformation;

    constructor() {
        super();
        this.dataSource = new DataSource(IceGatewayStreetLamps.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {
                    Authorization: "Token " + config.datasources.IGToken,
                },
                method: "GET",
                url: config.datasources.IGStreetLamps,
            }),
            new JSONDataTypeStrategy({resultsPath: ""}),
            new Validator(IceGatewayStreetLamps.name + "DataSource",
                IceGatewayStreetLamps.datasourceMongooseSchemaObject));
        this.model = new IceGatewayStreetLampsModel();
        this.transformation = new IceGatewayStreetLampsTransformation();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
    }

    public setDimValue = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        try {
            const requestObject: IHTTPSettings = {
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
