"use strict";

import { TSKParkingsDataSource } from "data-platform-schema-definitions";
import { model, Model, Schema, SchemaDefinition } from "mongoose";
import BaseSchema from "./BaseSchema";
import ISchema from "./ISchema";

export default class TSKParkingsDataSourceSchema extends BaseSchema implements ISchema {

    public schemaObject: SchemaDefinition;
    protected mongooseModel: Model;

    constructor() {
        super();
        this.schemaObject = TSKParkingsDataSource;
        try {
            this.mongooseModel = model("TSKParkingsDataSourceModel");
        } catch (error) {
            this.mongooseModel = model("TSKParkingsDataSourceModel",
                new Schema(this.schemaObject));
        }
    }

}
