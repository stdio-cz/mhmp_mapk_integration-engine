"use strict";

import { SchemaDefinition } from "mongoose";
import * as Sequelize from "sequelize";

export interface ISequelizeSettings {
    attributesToRemove: string[];
    name: string;
    outputSequelizeAttributes: Sequelize.DefineModelAttributes<any>;
    pgTableName: string;
    savingType: "insertOnly" | "insertOrUpdate";
    sequelizeAdditionalSettings: object;
    tmpPgTableName?: string;
}

export interface IMongooseSettings {
    identifierPath?: string;
    modelIndexes?: any[];
    mongoCollectionName: string;
    outputMongooseSchemaObject: SchemaDefinition;
    resultsPath?: string;
    savingType: "insertOnly" | "insertOrUpdate";
    updateValues?: (dbData: any, newData: any) => any;
    searchPath?: (id: any, multiple: boolean) => any;
    select?: string;
    tmpMongoCollectionName?: string;
}

export interface IModel2 {

    name: string;
    save: (data: any, useTmpTable: boolean) => Promise<any>;
    truncate: (useTmpTable: boolean) => Promise<any>;

}
