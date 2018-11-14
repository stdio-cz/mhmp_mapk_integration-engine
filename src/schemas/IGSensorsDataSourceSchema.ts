"use strict";

import { IGSensorsDataSource } from "data-platform-schema-definitions";
import { model, Model, Schema, SchemaDefinition } from "mongoose";
import BaseSchema from "./BaseSchema";
import ISchema from "./ISchema";

export default class IGSensorsDataSourceSchema extends BaseSchema implements ISchema {

    public schemaObject: SchemaDefinition;
    protected mongooseModel: Model;

    constructor() {
        super();
        this.schemaObject = IGSensorsDataSource;
        try {
            this.mongooseModel = model("IGSensorsDataSourceModel");
        } catch (error) {
            this.mongooseModel = model("IGSensorsDataSourceModel",
                new Schema(this.schemaObject));
        }
    }

}
