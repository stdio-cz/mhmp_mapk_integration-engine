"use strict";

import { IGSensorsHistory } from "data-platform-schema-definitions";
import { model, Model, Schema, SchemaDefinition } from "mongoose";
import BaseSchema from "./BaseSchema";
import ISchema from "./ISchema";

export default class IGSensorsHistSchema extends BaseSchema implements ISchema {

    public schemaObject: SchemaDefinition;
    protected mongooseModel: Model;

    constructor() {
        super();
        this.schemaObject = IGSensorsHistory;
        try {
            this.mongooseModel = model("IGSensorsHistModel");
        } catch (error) {
            this.mongooseModel = model("IGSensorsHistModel",
                new Schema(this.schemaObject));
        }
    }

}
