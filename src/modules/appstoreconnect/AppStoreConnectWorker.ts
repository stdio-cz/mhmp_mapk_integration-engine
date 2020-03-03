"use strict";

import { CustomError } from "@golemio/errors";
import { AppStoreConnect } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { sign } from "jsonwebtoken";
import { config } from "../../core/config";
import {
    CSVDataTypeStrategy,
    DataSource,
    HTTPProtocolStrategy,
} from "../../core/datasources";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { AppStoreConnectTransformation } from "./AppStoreConnectTransformation";

export class AppStoreConnectWorker extends BaseWorker {

    private model: PostgresModel;
    private appStoreDataSource: DataSource;
    private appStoreTransformation: AppStoreConnectTransformation;
    private bearerToken: string;

    constructor() {
        super();

        this.bearerToken = null;

        this.appStoreDataSource = new DataSource("AppStoreConnectDataSource",
            null,
            new CSVDataTypeStrategy({
                fastcsvParams: { headers: true, delimiter: "\t" },
                subscribe: (json: any) => json,
            }),
            new Validator(AppStoreConnect.name, AppStoreConnect.datasourceMongooseSchemaObject));
        this.appStoreTransformation = new AppStoreConnectTransformation();
        this.model = new PostgresModel(AppStoreConnect.name, {
            outputSequelizeAttributes: AppStoreConnect.outputSequelizeAttributes,
            pgTableName: AppStoreConnect.pgTableName,
            savingType: "insertOnly",
        },
        null /*new Validator(AppStoreConnect.name, AppStoreConnect.outputMongooseSchemaObject)*/);
    }

    public refreshDataInDb = async (msg: any): Promise<void> => {
        if (!msg.properties.headers.date) {
            throw new CustomError("Date for report has not been set", true, this.constructor.name, 400);
        }
        this.bearerToken = sign({
                aud: "appstoreconnect-v1",
                exp: Math.floor(Date.now() / 1000) + (20 * 60),
                iss: config.datasources.AppStoreConnectCredentials.iss,
            },
            config.datasources.AppStoreConnectCredentials.private_key,
            {
                header: {
                    alg: "ES256",
                    kid: config.datasources.AppStoreConnectCredentials.kid,
                    typ: "JWT",
                },
            });

        this.appStoreDataSource
            .setProtocolStrategy(
                new HTTPProtocolStrategy({
                    encoding: null,
                    headers: {
                        Accept: "application/a-gzip",
                        Authorization: `Bearer ${this.bearerToken}`,
                    },
                    isGunZipped: true, // TODO isGunZipped? :D
                    method: "GET",
                    url: config.datasources.AppStoreConnect.replace("{}", msg.properties.headers.date),
                },
            ));
        const data = await this.appStoreDataSource.getAll();
        const appStoreData = await this.appStoreTransformation
            .transform(data);
        await this.model.save(appStoreData);
    }
}
