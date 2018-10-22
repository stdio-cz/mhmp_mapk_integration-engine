"use strict";

import mongoose = require("mongoose");
import BaseSchema from "./BaseSchema";
import ISchema from "./ISchema";

export default class ParkingsResponseSchema extends BaseSchema implements ISchema {

    public schemaObject: mongoose.SchemaDefinition;
    protected mongooseModel: mongoose.Model;

    protected elementSchema = {
        geometry: {
            coordinates: { type: Array, required: true },
            type: { type: String, required: true },
        },
        properties: {
            id: { type: Number, required: true },
            last_updated: { type: String, required: true },
            name: { type: String, required: true },
            num_of_free_places: { type: Number, required: true },
            num_of_taken_places: { type: Number, required: true },
            parking_type: {
                description: { type: String, required: true },
                id: { type: Number, required: true },
            },
            total_num_of_places: { type: Number, required: true },
        },
        type: { type: String, required: true },
    };

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
            this.mongooseModel = mongoose.model("ParkingsResponseModel-" + requestType);
        } catch (error) {
            this.mongooseModel = mongoose.model("ParkingsResponseModel-" + requestType,
                new mongoose.Schema(this.schemaObject));
        }
    }

}
