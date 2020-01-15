"use strict";

import { CustomError } from "@golemio/errors";
import { MySequelize } from "../connectors";
import { IPostgresSettings, IProtocolStrategy } from "./";

export class PostgresProtocolStrategy implements IProtocolStrategy {

    private connectionSettings: IPostgresSettings;

    constructor(settings: IPostgresSettings) {
        this.connectionSettings = settings;
    }

    public setConnectionSettings = (settings: IPostgresSettings): void => {
        this.connectionSettings = settings;
    }

    public getData = async (): Promise<any> => {
        try {
            const connector = new MySequelize();
            const connection = await connector.connect(this.connectionSettings.connectionString);

            const model = connection.define(
                this.connectionSettings.tableName,
                this.connectionSettings.modelAttributes,
                {
                    ...((this.connectionSettings.sequelizeAdditionalSettings)
                        ? this.connectionSettings.sequelizeAdditionalSettings
                        : { freezeTableName: true, timestamps: true, underscored: true }), // default values
                    ...((this.connectionSettings.schemaName)
                        ? { schema: this.connectionSettings.schemaName }
                        : {}),
                },
            );

            // getting data and returning it as array of obejcts
            return await model
                .findAll(this.connectionSettings.findOptions)
                .map((r: any) => r.dataValues);
        } catch (err) {
            throw new CustomError("Error while getting data from server.", true, this.constructor.name, 2002, err);
        }
    }

    public getLastModified = async (): Promise<any> => {
        throw new Error("Method not implemented.");
    }

}
