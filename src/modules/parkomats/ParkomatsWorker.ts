"use strict";

import { Parkomats } from "@golemio/schema-definitions";
import { ObjectKeysValidator, Validator } from "@golemio/validator";
import * as moment from "moment-timezone";
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

        this.dataSourceHTTPSettings = {
            headers: {
                authorization: config.datasources.TSKParkomatsToken,
            },
            method: "GET",
            // Warning! Url must be filled with required `from` and `to` querystring param
            // if `to` omitted, API returns empty array!
            url: this.dataSourceUrl,
        };

        this.dataSource = new DataSource(Parkomats.name + "DataSource",
            new HTTPProtocolStrategy(this.dataSourceHTTPSettings),
            new JSONDataTypeStrategy({ resultsPath: "" }),
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

    // TODO resolve custom from/to use in different endpoint (/parkingsessionshistory)
    public refreshDataInDB = async (msg: any): Promise<void> => {
        let from: moment.Moment;
        let to: moment.Moment;
        try {
            // setting custom interval from message data
            const customInterval = JSON.parse(msg.content.toString());
            if (customInterval.from && customInterval.to) {
                from = moment.tz(new Date(customInterval.from), "Europe/Prague");
                to = moment.tz(new Date(customInterval.to), "Europe/Prague");
                log.debug(`Interval from: ${from} to ${to} was used.`);
            } else {
                throw new Error("Interval must contain from and to properties.");
            }
        } catch (err) {
            // setting default interval (normal situation)
            to = moment.tz(new Date(), "Europe/Prague");
            from = to.clone();
            from.subtract(12, "minutes");
        }

        const url = this.dataSourceUrl + from.format("YYYY-MM-DDTHH:mm:ss") + `&to=${to.format("YYYY-MM-DDTHH:mm:ss")}`;
        this.dataSourceHTTPSettings.url = url;
        this.dataSource.setProtocolStrategy(new HTTPProtocolStrategy(
            this.dataSourceHTTPSettings));

        const data = await this.dataSource.getAll();
        const transformedData: any[] = await this.transformation.transform(data);
        await this.model.save(transformedData);
    }
}
