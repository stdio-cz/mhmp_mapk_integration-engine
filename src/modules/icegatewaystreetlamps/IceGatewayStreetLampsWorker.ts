"use strict";

import { CustomError } from "@golemio/errors";
import { IceGatewayStreetLamps } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, IHTTPSettings, JSONDataTypeStrategy } from "../../core/datasources";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { IceGatewayStreetLampsTransformation } from "./";

import * as request from "request-promise";

export class IceGatewayStreetLampsWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: IceGatewayStreetLampsTransformation;
    private model: MongoModel;

    constructor() {
        super();
        this.dataSource = new DataSource(IceGatewayStreetLamps.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {
                    Authorization: "Token " + config.datasources.IGToken,
                },
                method: "GET",
                url: config.datasources.IGStreetLamps,
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(IceGatewayStreetLamps.name + "DataSource",
                IceGatewayStreetLamps.datasourceMongooseSchemaObject));
        this.model = new MongoModel(IceGatewayStreetLamps.name + "Model", {
            identifierPath: "properties.id",
            mongoCollectionName: IceGatewayStreetLamps.mongoCollectionName,
            outputMongooseSchemaObject: IceGatewayStreetLamps.outputMongooseSchemaObject,
            resultsPath: "properties",
            savingType: "insertOrUpdate",
            searchPath: (id, multiple) => (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id },
            updateValues: (a, b) => {
                a.properties.dim_value = b.properties.dim_value;
                a.properties.groups = b.properties.groups;
                a.properties.lamppost_id = b.properties.lamppost_id;
                a.properties.last_dim_override = b.properties.last_dim_override;
                a.properties.state = b.properties.state;
                a.properties.updated_at = b.properties.updated_at;
                return a;
            },
        },
            new Validator(IceGatewayStreetLamps.name + "ModelValidator",
                IceGatewayStreetLamps.outputMongooseSchemaObject),
        );
        this.transformation = new IceGatewayStreetLampsTransformation();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);
    }

    public setDimValue = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        try {
            const requestObject: IHTTPSettings = {
                body: {
                    value: inputData.value,
                },
                headers: {
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
            throw new CustomError("Error while sending the POST request.", true, this.constructor.name, 5003, err);
        }
    }
}
