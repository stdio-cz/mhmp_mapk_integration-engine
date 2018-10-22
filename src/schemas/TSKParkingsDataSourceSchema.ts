"use strict";

import mongoose = require("mongoose");
import BaseSchema from "./BaseSchema";
import ISchema from "./ISchema";

export default class TSKParkingsDataSourceSchema extends BaseSchema implements ISchema {

    public schemaObject: object;
    protected mongooseModel: mongoose.Model;

    constructor() {
        super();
        this.schemaObject = {
            gid: { type: Number },
            id: { type: Number, required: true },
            lastUpdated: { type: Number, required: true },
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            name: { type: String, required: true },
            numOfFreePlaces: { type: Number, required: true },
            numOfTakenPlaces: { type: Number, required: true },
            pr: { type: Boolean },
            totalNumOfPlaces: { type: Number, required: true },
        };
        try {
            this.mongooseModel = mongoose.model("TSKParkingsDataSourceModel");
        } catch (error) {
            this.mongooseModel = mongoose.model("TSKParkingsDataSourceModel",
                new mongoose.Schema(this.schemaObject));
        }
    }

}
