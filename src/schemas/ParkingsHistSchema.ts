"use strict";

import { ParkingsHistory } from "data-platform-schema-definitions";
import { model, Model, Schema, SchemaDefinition } from "mongoose";
import BaseSchema from "./BaseSchema";
import ISchema from "./ISchema";

export default class ParkingsHistSchema extends BaseSchema implements ISchema {

    public schemaObject: SchemaDefinition;
    protected mongooseModel: Model;

    constructor() {
        super();
        this.schemaObject = ParkingsHistory;
        try {
            this.mongooseModel = model("ParkingsHistModel");
        } catch (error) {
            this.mongooseModel = model("ParkingsHistModel",
                new Schema(this.schemaObject));
        }
    }

}
