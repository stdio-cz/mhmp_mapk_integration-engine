"use strict";

import { CityDistrictsDataSource } from "data-platform-schema-definitions";
import { model, Model, Schema, SchemaDefinition } from "mongoose";
import BaseSchema from "./BaseSchema";
import ISchema from "./ISchema";

export default class CityDistrictsDataSourceSchema extends BaseSchema implements ISchema {

    public schemaObject: SchemaDefinition;
    protected mongooseModel: Model;

    constructor() {
        super();
        this.schemaObject = CityDistrictsDataSource;
        try {
            this.mongooseModel = model("CityDistrictsDataSourceModel");
        } catch (error) {
            this.mongooseModel = model("CityDistrictsDataSourceModel", new Schema(this.schemaObject));
        }
    }

}
