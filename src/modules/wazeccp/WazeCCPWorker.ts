"use strict";

import { WazeCCP } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { WazeCCPAlertsTransformation, WazeCCPIrregularitiesTransformation, WazeCCPJamsTransformation } from "./";

export class WazeCCPWorker extends BaseWorker {
    private dataSourceAlerts: DataSource;
    private dataSourceIrregularities: DataSource;
    private dataSourceJams: DataSource;
    private modelAlerts: PostgresModel;
    private modelIrregularities: PostgresModel;
    private modelJams: PostgresModel;
    private transformationAlerts: WazeCCPAlertsTransformation;
    private transformationIrregularities: WazeCCPIrregularitiesTransformation;
    private transformationJams: WazeCCPJamsTransformation;
    private queuePrefix: string;

    constructor() {
        super();

        this.dataSourceAlerts = new DataSource(
            WazeCCP.alerts.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.WazeCCP + "&types=alerts",
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                WazeCCP.alerts.name + "DataSource",
                WazeCCP.alerts.datasourceMongooseSchemaObject,
            ),
        );
        this.dataSourceIrregularities = new DataSource(
            WazeCCP.irregularities.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.WazeCCP + "&types=irregularities",
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                WazeCCP.irregularities.name + "DataSource",
                WazeCCP.irregularities.datasourceMongooseSchemaObject,
            ),
        );
        this.dataSourceJams = new DataSource(
            WazeCCP.jams.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.WazeCCP + "&types=traffic",
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                WazeCCP.jams.name + "DataSource",
                WazeCCP.jams.datasourceMongooseSchemaObject,
            ),
        );

        this.transformationAlerts = new WazeCCPAlertsTransformation();
        this.transformationIrregularities = new WazeCCPIrregularitiesTransformation();
        this.transformationJams = new WazeCCPJamsTransformation();

        this.modelAlerts = new PostgresModel(
            WazeCCP.alerts.name + "Model",
            {
                outputSequelizeAttributes: WazeCCP.alerts.outputSequelizeAttributes,
                pgTableName: WazeCCP.alerts.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                WazeCCP.alerts.name + "ModelValidator",
                WazeCCP.alerts.outputMongooseSchemaObject,
            ),
        );
        this.modelIrregularities = new PostgresModel(
            WazeCCP.irregularities.name + "Model",
            {
                outputSequelizeAttributes:
                    WazeCCP.irregularities.outputSequelizeAttributes,
                pgTableName: WazeCCP.irregularities.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                WazeCCP.irregularities.name + "ModelValidator",
                WazeCCP.irregularities.outputMongooseSchemaObject,
            ),
        );
        this.modelJams = new PostgresModel(
            WazeCCP.jams.name + "Model",
            {
                outputSequelizeAttributes: WazeCCP.jams.outputSequelizeAttributes,
                pgTableName: WazeCCP.jams.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                WazeCCP.jams.name + "ModelValidator",
                WazeCCP.jams.outputMongooseSchemaObject,
            ),
        );

        this.queuePrefix =
            config.RABBIT_EXCHANGE_NAME + "." + WazeCCP.name.toLowerCase();
    }

    public refreshAlertsInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSourceAlerts.getAll();
        // enrich data by downloadedAt unix timestamp
        const dataWithDownloadAt = { ...data, downloadedAt: new Date().valueOf() };
        const transformedData = await this.transformationAlerts.transform(dataWithDownloadAt);
        await this.modelAlerts.saveBySqlFunction(transformedData, [ "id" ]);
    }

    public refreshIrregularitiesInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSourceIrregularities.getAll();
        // enrich data by downloadedAt unix timestamp
        const dataWithDownloadAt = { ...data, downloadedAt: new Date().valueOf() };
        const transformedData = await this.transformationIrregularities.transform(dataWithDownloadAt);
        await this.modelIrregularities.saveBySqlFunction(transformedData, [ "id" ]);
    }

    public refreshJamsInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSourceJams.getAll();
        // enrich data by downloadedAt unix timestamp
        const dataWithDownloadAt = { ...data, downloadedAt: new Date().valueOf() };
        const transformedData = await this.transformationJams.transform(dataWithDownloadAt);
        await this.modelJams.saveBySqlFunction(transformedData, [ "id" ]);
    }

    public refreshAllDataInDB = async (msg: any): Promise<void> => {
        const queueNames: string[] = [ "refreshAlertsInDB", "refreshIrregularitiesInDB", "refreshJamsInDB" ];

        await Promise.all(queueNames.map((queueName: string) => {
            return this.sendMessageToExchange("workers." + this.queuePrefix + "." + queueName,
                "Just do it!");
        }));
    }
}
