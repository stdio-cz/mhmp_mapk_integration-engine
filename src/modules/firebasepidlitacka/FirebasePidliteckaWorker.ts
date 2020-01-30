"use strict";

import { FirebasePidlitacka } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSource, JSONDataTypeStrategy, PostgresProtocolStrategy } from "../../core/datasources";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";

export class FirebasePidlitackaWorker extends BaseWorker {

    private appLaunchProtocolStrategy: PostgresProtocolStrategy;
    private appLaunchDatasource: DataSource;
    private appLaunchModel: PostgresModel;
    private eventsProtocolStrategy: PostgresProtocolStrategy;
    private eventsDatasource: DataSource;
    private eventsModel: PostgresModel;
    private routeProtocolStrategy: PostgresProtocolStrategy;
    private routeDatasource: DataSource;
    private routeModel: PostgresModel;
    private webEventsProtocolStrategy: PostgresProtocolStrategy;
    private webEventsDatasource: DataSource;
    private webEventsModel: PostgresModel;

    private queuePrefix: string;

    constructor() {
        super();

        // is it ok?
        // same DB server but different DB name
        const connectionString = config.POSTGRES_CONN.replace(new URL(config.POSTGRES_CONN).pathname, "/keboola");

        this.appLaunchProtocolStrategy = new PostgresProtocolStrategy({
            connectionString,
            modelAttributes: FirebasePidlitacka.appLaunch.datasourceSequelizeAttributes,
            schemaName: "public",
            sequelizeAdditionalSettings: {
                timestamps: false,
            },
            tableName: "firebase_pidlitacka_applaunch_par",
        }),
        this.appLaunchDatasource = new DataSource(
            FirebasePidlitacka.appLaunch.name + "DataSource",
            this.appLaunchProtocolStrategy,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                FirebasePidlitacka.appLaunch.name + "DataSource",
                FirebasePidlitacka.appLaunch.datasourceMongooseSchemaObject,
            ),
        );
        this.eventsProtocolStrategy = new PostgresProtocolStrategy({
            connectionString,
            modelAttributes: FirebasePidlitacka.events.datasourceSequelizeAttributes,
            schemaName: "public",
            sequelizeAdditionalSettings: {
                timestamps: false,
            },
            tableName: "firebase_pidlitacka_events",
        });
        this.eventsDatasource = new DataSource(
            FirebasePidlitacka.events.name + "DataSource",
            this.eventsProtocolStrategy,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                FirebasePidlitacka.events.name + "DataSource",
                FirebasePidlitacka.events.datasourceMongooseSchemaObject,
            ),
        );
        this.routeProtocolStrategy = new PostgresProtocolStrategy({
            connectionString,
            modelAttributes: FirebasePidlitacka.route.datasourceSequelizeAttributes,
            schemaName: "public",
            sequelizeAdditionalSettings: {
                timestamps: false,
            },
            tableName: "firebase_pidlitacka_route",
        });
        this.routeDatasource = new DataSource(
            FirebasePidlitacka.route.name + "DataSource",
            this.routeProtocolStrategy,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                FirebasePidlitacka.route.name + "DataSource",
                FirebasePidlitacka.route.datasourceMongooseSchemaObject,
            ),
        );
        this.webEventsProtocolStrategy = new PostgresProtocolStrategy({
            connectionString,
            modelAttributes: FirebasePidlitacka.webEvents.datasourceSequelizeAttributes,
            schemaName: "public",
            sequelizeAdditionalSettings: {
                timestamps: false,
            },
            tableName: "firebase_pidlitacka_web_events",
        });
        this.webEventsDatasource = new DataSource(
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
        // getting data from source DB
        const data = await this.appLaunchDatasource.getAll();
        // saving data to target DB
        await this.appLaunchModel.saveBySqlFunction(data, [ "event_date" ]);
        // deleting data from source DB
        await this.appLaunchProtocolStrategy.deleteData();
    }

    public async moveEvents(msg: any): Promise<void> {
        // getting data from source DB
        const data = await this.eventsDatasource.getAll();
        // saving data to target DB
        await this.eventsModel.saveBySqlFunction(data, [ "event_date", "event_name" ]);
        // deleting data from source DB
        await this.eventsProtocolStrategy.deleteData();
    }

    public async moveRoute(msg: any): Promise<void> {
        // getting data from source DB
        const data = await this.routeDatasource.getAll();
        // saving data to target DB
        await this.routeModel.saveBySqlFunction(data, [ "s_from", "s_to", "reference_date" ]);
        // deleting data from source DB
        await this.routeProtocolStrategy.deleteData();
    }

    public async moveWebEvents(msg: any): Promise<void> {
        // getting data from source DB
        const data = await this.webEventsDatasource.getAll();
        // saving data to target DB
        await this.webEventsModel.saveBySqlFunction(data, [ "reference_date" ]);
        // deleting data from source DB
        await this.webEventsProtocolStrategy.deleteData();
    }

}
