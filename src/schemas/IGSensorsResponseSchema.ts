"use strict";

import { IGSensors } from "data-platform-schema-definitions";
import { model, Model, Schema, SchemaDefinition } from "mongoose";
import BaseSchema from "./BaseSchema";
import ISchema from "./ISchema";

export default class IGSensorsResponseSchema extends BaseSchema implements ISchema {

    public schemaObject: SchemaDefinition;
    protected mongooseModel: Model;

    protected elementSchema = IGSensors;

    protected collectionSchema = {
        features: [
            this.elementSchema,
        ],
        type: { type: String, required: true },
    };

    constructor(requestType: string) {
        super();
        this.schemaObject = this[requestType];
        try {
            this.mongooseModel = model("IGSensorsResponseModel-" + requestType);
        } catch (error) {
            this.mongooseModel = model("IGSensorsResponseModel-" + requestType,
                new Schema(this.schemaObject));
        }
    }

}
