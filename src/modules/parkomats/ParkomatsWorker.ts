"use strict";

import { Parkomats } from "@golemio/schema-definitions";
import { ObjectKeysValidator, Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, IHTTPSettings, JSONDataTypeStrategy } from "../../core/datasources";
import { log } from "../../core/helpers";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { ParkomatsTransformation } from "./";

export class ParkomatsWorker extends BaseWorker {

    private dataSource: DataSource;
    private dataSourceHTTPSettings: IHTTPSettings;
    private transformation: ParkomatsTransformation;
    private model: PostgresModel;

    private dataSourceUrl = config.datasources.TSKParkomats + "/parkingsessions?from=";

    constructor() {
        super();
        const dataTypeStrategy = new JSONDataTypeStrategy({ resultsPath: "" });

        this.dataSourceHTTPSettings = {
            headers: {
                authorization: config.datasources.TSKParkomatsToken,
            },
            method: "GET",
            // Warning! Url must be filled with required `from` querystring param
            url: this.dataSourceUrl,
        };

        this.dataSource = new DataSource(Parkomats.name + "DataSource",
            new HTTPProtocolStrategy(this.dataSourceHTTPSettings),
            dataTypeStrategy,
            new ObjectKeysValidator(Parkomats.name + "DataSource", Parkomats.datasourceMongooseSchemaObject));
        this.model = new PostgresModel(Parkomats.name + "Model", {
            outputSequelizeAttributes: Parkomats.outputSequelizeAttributes,
            pgTableName: Parkomats.pgTableName,
            savingType: "insertOrUpdate",
        },
            new Validator(Parkomats.name + "ModelValidator", Parkomats.outputMongooseSchemaObject),
        );
        this.transformation = new ParkomatsTransformation();
    }

    // from cron tasks
    public refreshDataInDB = async (msg: any): Promise<void> => {
        function setDefaultFrom(): Date {
            // setting default interval (normal situation)
            const d = new Date();
            d.setMinutes(d.getMinutes() - 12); // last 12 minutes from now
            return d;
        }

        let from: Date;
        let to: Date;
        try {
            // setting custom interval from message data
            const content = msg.content.toString();
            const customInterval = JSON.parse(content);
            if (customInterval.from) {
                from = new Date(customInterval.from);
            } else {
                from = setDefaultFrom();
            }
            if (customInterval.to) {
                to = new Date(customInterval.to);
            }

            if (from && to) {
                log.debug(`Interval from: ${from.toISOString()} to ${to.toISOString()} was used.`);
            } else if (from) {
                log.debug(`Parameter from: ${from.toISOString()} was used.`);
            }
        } catch (err) {
            from = setDefaultFrom();
        }

        let url = this.dataSourceUrl + from.toISOString();
        if (to) {
            url += `&to=${to.toISOString()}`;
        }
        this.dataSourceHTTPSettings.url = url;
        this.dataSource.setProtocolStrategy(new HTTPProtocolStrategy(
            this.dataSourceHTTPSettings));

        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);
    }
}
