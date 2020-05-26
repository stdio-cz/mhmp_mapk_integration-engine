"use strict";

import * as Sequelize from "sequelize";

import { DataSourceStream } from "./";

export interface IHTTPSettings {
    /** (optional) Data to send with request, e.g. credentials */
    body?: any;

    /** Object with HTTP headers. */
    headers: object;

    /** (optional) Is JSON payload */
    json?: boolean;

    /** HTTP method */
    method: string;

    /** Url of the data source. */
    url: string;

    strictSSL?: boolean;
    encoding?: any;
    rejectUnauthorized?: boolean;
    isCompressed?: boolean;
    whitelistedFiles?: string[];
    isGunZipped?: boolean;
}

export interface IFTPSettings {

    /** Filename of the data source. */
    filename: string;

    /** Url of the ftp host. */
    url: string | { host: string, password: string, secure?: boolean, user: string };

    /** Path to file. */
    path: string;

    /** Tmp directory */
    tmpDir: string;

    isCompressed?: boolean;
    hasSubFiles?: boolean;
    whitelistedFiles?: string[];
}

export interface IPostgresSettings {

    /** Connection string to PostgreSQL. */
    connectionString: string;

    /** Schema name. */
    schemaName: string;

    /** Table name. */
    tableName: string;

    /** Database table schema. */
    modelAttributes: Sequelize.DefineModelAttributes<any>;

    /**
     * Sequelize additional settings, e.g. indexes.
     * Default values: { freezeTableName: true, timestamps: true, underscored: true }
     */
    sequelizeAdditionalSettings?: object;

    /**
     * Sequelize findAll() options object.
     * https://sequelize.org/master/class/lib/model.js~Model.html#static-method-findAll
     */
    findOptions?: any;
}

export interface IGoogleCloudStorageSettings {

    /** Path to json key file downloaded from the Google Developers Console */
    keyFilename: string;

    /** Name of the bucket. */
    bucketName: string;

    /** Filter results to objects whose names begin with this prefix. */
    filesPrefix?: string;

    /** Custom function to filter files, e.g. by name. */
    filesFilter?: (item: any) => any;
}

export interface IProtocolStrategy {
    setCallerName( caller: string): void;

    setConnectionSettings(settings: IHTTPSettings | IFTPSettings | IPostgresSettings
        | IGoogleCloudStorageSettings): void;

    getData(): Promise<any | DataSourceStream>;

    // getRawData(): Promise<any | DataSourceStream>;

    getLastModified(): Promise<any>;

}
