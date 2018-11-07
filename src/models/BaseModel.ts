"use strict";

import mongoose = require("mongoose");
import CustomError from "../helpers/errors/CustomError";
import ISchema from "../schemas/ISchema";

export default abstract class BaseModel {

    /** The Mongoose Model */
    public abstract mongooseModel: mongoose.model;
    /** Saves transformed element or collection to database and updates refresh timestamp. */
    public abstract SaveToDb;
    /** Model name */
    public abstract name: string;
    /** Object to sorting data from model. Default = null */
    public sort;
    /** Object to filter data from model. Default = null */
    public where;
    /** The schema which contains schemaObject for creating the Mongoose Schema */
    protected abstract schema: ISchema;
    /** Path where to look for ID - identifier to search by */
    protected searchPath;
    /** String to specify selection of DB query. */
    protected select;
    /** Function which cover results to specific object, e.g. GeoJson. Default = null */
    protected createOutputCollection;

    constructor() {
        this.searchPath = (id, multiple = false) => {
            return (multiple)
                ? { id: { $in: id } }
                : { id };
        };
        this.sort = null;
        this.where = null;
        this.select = "-_id -__v";
        this.createOutputCollection = null;
    }

    public GetOneFromModel = async (id: any): Promise<any> => {
        try {
            const data = await this.mongooseModel.findOne(this.searchPath(id)).exec();
            if (!data) {
                throw new CustomError("Model data was not found.", true, 1014);
            } else {
                return data;
            }
        } catch (err) {
            throw err;
        }
    }

    /**
     * Data validation
     *
     * @param {any} data
     * @returns {boolean}
     */
    public Validate = async (data: any): Promise<boolean> => {
        if (data instanceof Array) {
            if (data.length === 0) {
                return true;
            } else {
                const promises = data.map((element) => {
                    return this.ValidateElement(element);
                });
                const elemResults = await Promise.all(promises);
                return (elemResults.indexOf(false) !== -1) ? false : true;
            }
        } else {
            return await this.ValidateElement(data);
        }
    }

    /**
     * Helper method to validate one object from an array
     *
     * @param {object} data
     * @returns {boolean}
     */
    protected ValidateElement = (data: object): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            const modelInstance = new this.mongooseModel(data);
            modelInstance.validate((error) => {
                if (error) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

}
