"use strict";

import { SchemaDefinition } from "mongoose";
import { log, Validator } from "./";
import { CustomError } from "./errors";

/**
 * Helper class for validation by mongoose model.
 */
export class ObjectKeysValidator extends Validator {

    constructor(modelName: string, schemaObject: SchemaDefinition) {
        super(modelName, schemaObject);
    }

    /**
     * Data validation
     *
     * @param {object} data
     * @returns {boolean} Returns true or throw error
     */
    public Validate = async (data: object): Promise<boolean> => {
        if (data instanceof Object) {
            const promises = Object.keys(data).map((key) => {
                const element = data[key];
                return this.ValidateObject(element);
            });
            await Promise.all(promises);
            return true;
        } else {
            const error = "data must be object";
            log.error(error);
            throw new CustomError("Validation error in model: " + this.modelName, true,
                this.constructor.name, 1007, error);
        }
    }

    /**
     * Helper method to validate one object key (which can be array or object)
     *
     * @param {any} data
     * @returns {boolean} Returns true or throw error
     */
    private ValidateObject = async (data: any): Promise<boolean> => {
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
}
