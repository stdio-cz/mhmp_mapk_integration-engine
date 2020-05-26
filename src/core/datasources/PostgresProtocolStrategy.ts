"use strict";

import { CustomError } from "@golemio/errors";
import { MySequelize } from "../connectors";
import { IPostgresSettings, IProtocolStrategy } from "./";
import { ProtocolStrategy } from "./ProtocolStrategy";

export class PostgresProtocolStrategy extends ProtocolStrategy  implements IProtocolStrategy {

    protected connectionSettings: IPostgresSettings;

    constructor(settings: IPostgresSettings) {
        super(settings);
    }

    public setConnectionSettings = (settings: IPostgresSettings): void => {
        this.connectionSettings = settings;
    }

    public getLastModified = async (): Promise<any> => {
        throw new Error("Method not implemented.");
    }

    public deleteData = async (): Promise<void> => {
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

            await model.destroy({
                cascade: false,
                truncate: true,
            });

            // Close all connections used by this sequelize instance,
            // and free all references so the instance can be garbage collected.
            await connection.close();
        } catch (err) {
            throw new CustomError("Error while deleting data from server.", true, this.constructor.name, 2002, err);
        }
    }

    public getRawData = async (): Promise<any> => {
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
            const results = await model
                .findAll(this.connectionSettings.findOptions)
                .map((r: any) => r.dataValues);

            // Close all connections used by this sequelize instance,
            // and free all references so the instance can be garbage collected.
            await connection.close();

            return results;
        } catch (err) {
            throw new CustomError("Error while getting data from server.", true, this.constructor.name, 2002, err);
        }
    }
}
