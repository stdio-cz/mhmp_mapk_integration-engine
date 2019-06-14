"use strict";

import { SchemaDefinition } from "mongoose";
import * as Sequelize from "sequelize";

export interface ISequelizeSettings {
    attributesToRemove?: string[];
    outputSequelizeAttributes: Sequelize.DefineModelAttributes<any>;
    pgTableName: string;
    savingType: "insertOnly" | "insertOrUpdate";
    sequelizeAdditionalSettings?: object;
    hasTmpTable?: boolean;
}

export interface IMongooseSettings {
    identifierPath: string;
    mongoCollectionName: string;
    outputMongooseSchemaObject: SchemaDefinition;
    resultsPath?: string;
    savingType: "readOnly" | "insertOnly" | "insertOrUpdate";
    updateValues?: (dbData: any, newData: any) => any;
    searchPath?: (id: any, multiple: boolean) => any;
    select?: string;
    tmpMongoCollectionName?: string;
}

export interface IRedisSettings {
    isKeyConstructedFromData: boolean;
    prefix: string;
    tmpPrefix?: string;
    encodeDataBeforeSave?: (raw: any) => any;
    decodeDataAfterGet?: (encoded: any) => any;
}

export interface IModel {

    name: string;
    save: (data: any, useTmpTable: boolean) => Promise<any>;
    truncate: (useTmpTable: boolean) => Promise<any>;

}
