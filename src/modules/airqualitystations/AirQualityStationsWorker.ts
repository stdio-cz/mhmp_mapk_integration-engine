"use strict";

import { AirQualityStations } from "@golemio/schema-definitions";
import { JSONSchemaValidator, Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { AirQualityStationsTransformation } from "./";

export class AirQualityStationsWorker extends BaseWorker {

    private dataSource1H: DataSource;
    private dataSource3H: DataSource;
    private transformation: AirQualityStationsTransformation;
    private indexesModel: PostgresModel;
    private measurementsModel: PostgresModel;
    private stationsModel: PostgresModel;

    constructor() {
        super();
        this.dataSource1H = new DataSource(AirQualityStations.name + "1HDataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.AirQualityStations1H,
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(AirQualityStations.name + "1HDataSource",
                AirQualityStations.datasourceJsonSchema,
        ));
        this.dataSource3H = new DataSource(AirQualityStations.name + "3HDataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.AirQualityStations3H,
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(AirQualityStations.name + "3HDataSource",
                AirQualityStations.datasourceJsonSchema,
        ));
        this.transformation = new AirQualityStationsTransformation();
        this.stationsModel = new PostgresModel(AirQualityStations.stations.name + "Model", {
                outputSequelizeAttributes: AirQualityStations.stations.outputSequelizeAttributes,
                pgTableName: AirQualityStations.stations.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(AirQualityStations.stations.name + "ModelValidator",
            AirQualityStations.stations.outputMongooseSchemaObject),
        );
        this.measurementsModel = new PostgresModel(AirQualityStations.measurements.name + "Model", {
                outputSequelizeAttributes: AirQualityStations.measurements.outputSequelizeAttributes,
                pgTableName: AirQualityStations.measurements.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(AirQualityStations.measurements.name + "ModelValidator",
            AirQualityStations.measurements.outputMongooseSchemaObject),
        );
        this.indexesModel = new PostgresModel(AirQualityStations.indexes.name + "Model", {
                outputSequelizeAttributes: AirQualityStations.indexes.outputSequelizeAttributes,
                pgTableName: AirQualityStations.indexes.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(AirQualityStations.indexes.name + "ModelValidator",
            AirQualityStations.indexes.outputMongooseSchemaObject),
        );
    }

    public refresh1HDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource1H.getAll();
        const transformedData = await this.transformation.transform(data);
        await Promise.all([
            this.stationsModel.save(transformedData.stations),
            this.measurementsModel.save(transformedData.measurements),
            this.indexesModel.save(transformedData.indexes),
        ]);
    }

    public refresh3HDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource3H.getAll();
        const transformedData = await this.transformation.transform(data);
        await Promise.all([
            this.stationsModel.save(transformedData.stations),
            this.measurementsModel.save(transformedData.measurements),
            this.indexesModel.save(transformedData.indexes),
        ]);
    }
}
