"use strict";

import { MobileAppStatistics } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { sign } from "jsonwebtoken";
import * as moment from "moment-timezone";
import { config } from "../../core/config";
import {
    CSVDataTypeStrategy, DataSource, GoogleCloudStorageProtocolStrategy, HTTPProtocolStrategy,
    JSONDataTypeStrategy,
} from "../../core/datasources";
import { log } from "../../core/helpers";
import { PostgresModel, RedisModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { AppStoreTransformation, PlayStoreTransformation } from "./";

export class MobileAppStatisticsWorker extends BaseWorker {

    private appStoreDataSource: DataSource;
    private appStoreTransformation: AppStoreTransformation;
    private appStoreModel: PostgresModel;
    private playStoreDataSource: DataSource;
    private playStoreTransformation: PlayStoreTransformation;
    private playStoreModel: PostgresModel;
    private redisModel: RedisModel;

    constructor() {
        super();
        this.appStoreDataSource = new DataSource(MobileAppStatistics.appStore.name + "DataSource",
            null,
            new CSVDataTypeStrategy({
                fastcsvParams: { headers: true, delimiter: "\t" },
                subscribe: (json: any) => json,
            }),
            new Validator(MobileAppStatistics.appStore.name + "DataSource",
                MobileAppStatistics.appStore.datasourceMongooseSchemaObject),
        );
        this.appStoreTransformation = new AppStoreTransformation();
        this.appStoreModel = new PostgresModel(MobileAppStatistics.appStore.name + "Model", {
                outputSequelizeAttributes: MobileAppStatistics.appStore.outputSequelizeAttributes,
                pgTableName: MobileAppStatistics.appStore.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(MobileAppStatistics.appStore.name + "ModelValidator",
                MobileAppStatistics.appStore.outputMongooseSchemaObject),
        );

        this.playStoreDataSource = new DataSource(MobileAppStatistics.playStore.name + "DataSource",
            new GoogleCloudStorageProtocolStrategy({
                    bucketName: "pubsite_prod_rev_01447282685199189351",
                    filesFilter: (f: File) => f.name.indexOf("_overview.csv") !== -1,
                    filesPrefix: "stats/installs",
                    keyFilename: config.datasources.PlayStoreKeyFilename,
                }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(MobileAppStatistics.playStore.name + "DataSource",
                MobileAppStatistics.playStore.datasourceMongooseSchemaObject),
        );
        this.playStoreTransformation = new PlayStoreTransformation();
        this.playStoreModel = new PostgresModel(MobileAppStatistics.playStore.name + "Model", {
                outputSequelizeAttributes: MobileAppStatistics.playStore.outputSequelizeAttributes,
                pgTableName: MobileAppStatistics.playStore.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(MobileAppStatistics.playStore.name + "ModelValidator",
                MobileAppStatistics.playStore.outputMongooseSchemaObject),
        );

        this.redisModel = new RedisModel(
            MobileAppStatistics.name + "Model",
            {
                isKeyConstructedFromData: false,
                prefix: "files",
            },
            null,
        );
    }

    public refreshAppStoreDataInDB = async (msg: any): Promise<void> => {
        let date: moment.Moment;
        try {
            // setting custom date from message data
            const input = JSON.parse(msg.content.toString());
            if (input.date) {
                date = moment.tz(input.date, "Europe/Prague");
                log.debug(`Custom date: ${date} was used.`);
            } else {
                throw new Error("Input message must contain 'date' property.");
            }
        } catch (err) {
            // setting default date (normal situation)
            date = moment.tz(new Date(), "Europe/Prague");
            date.subtract(1, "day");
        }

        log.debug(`Used date: ${date.format("YYYY-MM-DD")}`);

        const bearerToken = sign({
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

        this.appStoreDataSource.setProtocolStrategy(
            new HTTPProtocolStrategy({
                encoding: null,
                headers: {
                    Accept: "application/a-gzip",
                    Authorization: `Bearer ${bearerToken}`,
                },
                isGunZipped: true,
                method: "GET",
                url: config.datasources.AppStoreConnect.replace(":reportDate", date.format("YYYY-MM-DD")),
            }),
        );

        const data = await this.appStoreDataSource.getAll();
        const transformedData = await this.appStoreTransformation.transform(data);
        await this.appStoreModel.save(transformedData);
    }

    public refreshPlayStoreDataInDB = async (msg: any): Promise<void> => {
        const data = await this.playStoreDataSource.getAll();
        const inputData = await Promise.all(data.map(async (d) => {
            d.data = await this.redisModel.getData(d.filepath);
            return d;
        }));
        const transformedData = await this.playStoreTransformation.transform(inputData);
        await this.playStoreModel.save(transformedData);
    }

}
