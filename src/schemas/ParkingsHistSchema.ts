"use strict";

import mongoose = require("mongoose");
import BaseSchema from "./BaseSchema";
import ISchema from "./ISchema";

export default class ParkingsHistSchema extends BaseSchema implements ISchema {

    public schemaObject: object;
    protected mongooseModel: mongoose.Model;

    constructor() {
        super();
        this.schemaObject = {
            id: { type: Number, required: true },
            num_of_free_places: { type: Number, required: true },
            num_of_taken_places: { type: Number, required: true },
            time: { type: String, required: true },
            total_num_of_places: { type: Number, required: true },
        };
        try {
            this.mongooseModel = mongoose.model("ParkingsHistModel");
        } catch (error) {
            this.mongooseModel = mongoose.model("ParkingsHistModel",
                new mongoose.Schema(this.schemaObject));
        }
    }

}
