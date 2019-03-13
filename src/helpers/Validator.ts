"use strict";

import { model, Model, Schema, SchemaDefinition } from "mongoose";
import CustomError from "./errors/CustomError";
import log from "./Logger";

/**
 * Helper class for validation by mongoose model.
 */
export default class Validator {

    /** Name of the model */
    private modelName: string;
    /** Reference to mongoose model object, used for validation */
    private mongooseModel: Model<any>;

    constructor(modelName: string, schemaObject: SchemaDefinition) {
        this.modelName = modelName;
        try {
            this.mongooseModel = model(this.modelName);
        } catch (error) {
            this.mongooseModel = model(this.modelName, new Schema(schemaObject, { bufferCommands: false }));
        }
    }

    /**
     * Data validation
     *
     * @param {any} data
     * @returns {boolean} Returns true or throw error
     */
    public Validate = async (data: any): Promise<boolean> => {
        if (data instanceof Array) {
            if (data.length === 0) {
                return true;
            } else {
                const promises = data.map((element) => {
                    return this.ValidateElement(element);
                });
                await Promise.all(promises);
                return true;
            }
        } else {
            return await this.ValidateElement(data);
        }
    }

    /**
     * Helper method to validate one object from an array
     *
     * @param {object} data
     * @returns {boolean} Returns true or throw error
     */
    private ValidateElement = async (data: object): Promise<boolean> => {
        try {
            const modelInstance = new this.mongooseModel(data);
            await modelInstance.validate();
            return true;
        } catch (error) {
            log.error(error);
            throw new CustomError("Validation error in model: " + this.modelName, true,
                this.constructor.name, 1007, error);
        }
    }

}
