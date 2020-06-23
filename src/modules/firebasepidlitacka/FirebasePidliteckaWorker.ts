"use strict";

import { DataSourceStream } from "../../core/datasources/DataSourceStream";

import { CustomError } from "@golemio/errors";
import { FirebasePidlitacka } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import {
    DataSourceStreamed,
    JSONDataTypeStrategy,
    PostgresProtocolStrategyStreamed ,
} from "../../core/datasources";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";

export class FirebasePidlitackaWorker extends BaseWorker {

    private appLaunchProtocolStrategy: PostgresProtocolStrategyStreamed;
    private appLaunchDatasource: DataSourceStreamed;
    private appLaunchModel: PostgresModel;
    private dataStream: DataSourceStream;
    private eventsProtocolStrategy: PostgresProtocolStrategyStreamed;
    private eventsDatasource: DataSourceStreamed;
    private eventsModel: PostgresModel;
    private routeProtocolStrategy: PostgresProtocolStrategyStreamed;
    private routeDatasource: DataSourceStreamed;
    private routeModel: PostgresModel;
    private webEventsProtocolStrategy: PostgresProtocolStrategyStreamed;
    private webEventsDatasource: DataSourceStreamed;
    private webEventsModel: PostgresModel;

    private queuePrefix: string;

    constructor() {
        super();

        // is it ok?
        // same DB server but different DB name
        const connectionString = config.POSTGRES_CONN.replace(new URL(config.POSTGRES_CONN).pathname, "/stage");

        this.appLaunchProtocolStrategy = new PostgresProtocolStrategyStreamed({
            connectionString,
            modelAttributes: FirebasePidlitacka.appLaunch.datasourceSequelizeAttributes,
            schemaName: "keboola",
            sequelizeAdditionalSettings: {
                timestamps: false,
            },
            tableName: "firebase_pidlitacka_applaunch_par",
        }),
        this.appLaunchDatasource = new DataSourceStreamed(
            FirebasePidlitacka.appLaunch.name + "DataSource",
            this.appLaunchProtocolStrategy,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                FirebasePidlitacka.appLaunch.name + "DataSource",
                FirebasePidlitacka.appLaunch.datasourceMongooseSchemaObject,
            ),
        );
        this.eventsProtocolStrategy = new PostgresProtocolStrategyStreamed({
            connectionString,
            modelAttributes: FirebasePidlitacka.events.datasourceSequelizeAttributes,
            schemaName: "keboola",
            sequelizeAdditionalSettings: {
                timestamps: false,
            },
            tableName: "firebase_pidlitacka_events",
        });
        this.eventsDatasource = new DataSourceStreamed(
            FirebasePidlitacka.events.name + "DataSource",
            this.eventsProtocolStrategy,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                FirebasePidlitacka.events.name + "DataSource",
                FirebasePidlitacka.events.datasourceMongooseSchemaObject,
            ),
        );
        this.routeProtocolStrategy = new PostgresProtocolStrategyStreamed({
            connectionString,
            modelAttributes: FirebasePidlitacka.route.datasourceSequelizeAttributes,
            schemaName: "keboola",
            sequelizeAdditionalSettings: {
                timestamps: false,
            },
            tableName: "firebase_pidlitacka_route",
        });
        this.routeDatasource = new DataSourceStreamed(
            FirebasePidlitacka.route.name + "DataSource",
            this.routeProtocolStrategy,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                FirebasePidlitacka.route.name + "DataSource",
                FirebasePidlitacka.route.datasourceMongooseSchemaObject,
            ),
        );
        this.webEventsProtocolStrategy = new PostgresProtocolStrategyStreamed({
            connectionString,
            modelAttributes: FirebasePidlitacka.webEvents.datasourceSequelizeAttributes,
            schemaName: "keboola",
            sequelizeAdditionalSettings: {
                timestamps: false,
            },
            tableName: "firebase_pidlitacka_web_events",
        });
        this.webEventsDatasource = new DataSourceStreamed(
            FirebasePidlitacka.webEvents.name + "DataSource",
            this.webEventsProtocolStrategy,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                FirebasePidlitacka.webEvents.name + "DataSource",
                FirebasePidlitacka.webEvents.datasourceMongooseSchemaObject,
            ),
        );

        this.appLaunchModel = new PostgresModel(FirebasePidlitacka.appLaunch.name + "Model", {
                outputSequelizeAttributes: FirebasePidlitacka.appLaunch.outputSequelizeAttributes,
                pgTableName: FirebasePidlitacka.appLaunch.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                FirebasePidlitacka.appLaunch.name + "ModelValidator",
                FirebasePidlitacka.appLaunch.outputMongooseSchemaObject,
            ),
        );
        this.eventsModel = new PostgresModel(FirebasePidlitacka.events.name + "Model", {
                outputSequelizeAttributes: FirebasePidlitacka.events.outputSequelizeAttributes,
                pgTableName: FirebasePidlitacka.events.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                FirebasePidlitacka.events.name + "ModelValidator",
                FirebasePidlitacka.events.outputMongooseSchemaObject,
            ),
        );
        this.routeModel = new PostgresModel(FirebasePidlitacka.route.name + "Model", {
                outputSequelizeAttributes: FirebasePidlitacka.route.outputSequelizeAttributes,
                pgTableName: FirebasePidlitacka.route.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                FirebasePidlitacka.route.name + "ModelValidator",
                FirebasePidlitacka.route.outputMongooseSchemaObject,
            ),
        );
        this.webEventsModel = new PostgresModel(FirebasePidlitacka.webEvents.name + "Model", {
                outputSequelizeAttributes: FirebasePidlitacka.webEvents.outputSequelizeAttributes,
                pgTableName: FirebasePidlitacka.webEvents.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                FirebasePidlitacka.webEvents.name + "ModelValidator",
                FirebasePidlitacka.webEvents.outputMongooseSchemaObject,
            ),
        );

        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + FirebasePidlitacka.name.toLowerCase();
    }

    public async moveAll(msg: any): Promise<void> {
        const queueNames = [ "moveAppLaunch", "moveEvents", "moveRoute", "moveWebEvents" ];

        await Promise.all(queueNames.map((queueName: string) => {
            return this.sendMessageToExchange("workers." + this.queuePrefix + "." + queueName,
                "Just do it!");
        }));
    }

    public async moveAppLaunch(msg: any): Promise<void> {
        await this.moveData(
            this.appLaunchDatasource,
            this.appLaunchModel,
            [ "event_date" ],
            this.appLaunchProtocolStrategy,
        );
    }

    public async moveEvents(msg: any): Promise<void> {
        await this.moveData(
            this.eventsDatasource,
            this.eventsModel,
            [ "event_date", "event_name" ],
            this.eventsProtocolStrategy,
        );
    }

    public async moveRoute(msg: any): Promise<void> {
        await this.moveData(
            this.routeDatasource,
            this.routeModel,
            [ "s_from", "s_to", "reference_date" ],
            this.routeProtocolStrategy,
        );
    }

    public async moveWebEvents(msg: any): Promise<void> {
        await this.moveData(
            this.webEventsDatasource,
            this.webEventsModel,
            [ "reference_date" ],
            this.webEventsProtocolStrategy,
        );
    }

    private async moveData(
        datasource: DataSourceStreamed,
        model: PostgresModel,
        primaryKeys: string[],
        strategy: PostgresProtocolStrategyStreamed,
    ): Promise<void> {
        try {
            this.dataStream = await datasource.getAll();
        } catch (err) {
            throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
        }

        try {
            await this.dataStream.setDataProcessor(async (data: any) => {
                await model.saveBySqlFunction(data, primaryKeys);
            })
            .setOnEndFunction(async () => {
                await strategy.deleteData();
            })
            .proceed();
        } catch (err) {
            throw new CustomError("Error processing data.", true, this.constructor.name, 5051, err);
        }
    }
}
