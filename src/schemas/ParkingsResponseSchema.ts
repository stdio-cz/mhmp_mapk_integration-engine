"use strict";

import { Parkings } from "data-platform-schema-definitions";
import { model, Model, Schema, SchemaDefinition } from "mongoose";
import BaseSchema from "./BaseSchema";
import ISchema from "./ISchema";

export default class ParkingsResponseSchema extends BaseSchema implements ISchema {

    public schemaObject: SchemaDefinition;
    protected mongooseModel: Model;

    protected elementSchema = Parkings;

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
            this.mongooseModel = model("ParkingsResponseModel-" + requestType);
        } catch (error) {
            this.mongooseModel = model("ParkingsResponseModel-" + requestType,
                new Schema(this.schemaObject));
        }
    }

}
