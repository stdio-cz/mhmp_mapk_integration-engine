"use strict";

import mongoose = require("mongoose");
import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";

export default abstract class BaseModel {

    /** Model name */
    public abstract name: string;
    /** Saves transformed element or collection to database and updates refresh timestamp. */
    public abstract SaveToDb;
    /** The Mongoose Model */
    protected abstract mongooseModel: mongoose.Model<any>;
    /** Validation helper */
    protected abstract validator: Validator;
    /** Path where to look for ID - identifier to search by */
    protected searchPath;
    /** String to specify selection of DB query. */
    protected select;

    constructor() {
        this.searchPath = (id, multiple = false) => {
            return (multiple)
                ? { id: { $in: id } }
                : { id };
        };
        this.select = "-_id -__v";
    }

    public GetOneFromModel = async (id: any): Promise<any> => {
        try {
            const data = await this.mongooseModel.findOne(this.searchPath(id)).exec();
            if (!data) {
                throw new CustomError("Model data was not found.", true, this.name, 1014);
            } else {
                return data;
            }
        } catch (err) {
            throw err;
        }
    }

}
