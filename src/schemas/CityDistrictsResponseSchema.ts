"use strict";

import { CityDistricts } from "data-platform-schema-definitions";
import { model, Model, Schema, SchemaDefinition } from "mongoose";
import BaseSchema from "./BaseSchema";
import ISchema from "./ISchema";

export default class TrafficCamerasResponseSchema extends BaseSchema implements ISchema {

    public schemaObject: SchemaDefinition;
    protected mongooseModel: Model;

    protected elementSchema = CityDistricts;

    protected collectionSchema = this.elementSchema;

    constructor(requestType: string) {
        super();
        this.schemaObject = this[requestType];
        try {
            this.mongooseModel = model("CityDistrictsResponseModel-" + requestType);
        } catch (error) {
            this.mongooseModel = model("CityDistrictsResponseModel-"
                + requestType, new Schema(this.schemaObject));
        }
    }

}
