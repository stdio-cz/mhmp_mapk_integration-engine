"use strict";

import { Model, SchemaDefinition } from "mongoose";
import ISchema from "../schemas/ISchema";

/**
 * Class representing an object schema.
 * Schema for source data or response data.
 * Specifies a JSON schema for the object and uses mongoose Model for validation for the schema.
 */
export default abstract class BaseSchema implements ISchema {

    /** The (json) schema object */
    public abstract schemaObject: SchemaDefinition;
    /** Reference to mongoose model object, used for validation */
    protected abstract mongooseModel: Model;

    /** Validate input object by this schema
     * @return true if the object is succesfully validated by the schema
     */
    public Validate = (data: any): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            if (data instanceof Array && data.length === 0) {
                return resolve(true);
            }

            let modelData: Model;

            if (data instanceof Array) {
                const promises = data.map((d) => {
                    return new Promise((res, rej) => {
                        modelData = new this.mongooseModel(d);
                        modelData.validate((error) => {
                            if (error) {
                                return res(false);
                            } else {
                                return res(true);
                            }
                        });
                    });
                });
                Promise.all(promises).then((results: boolean[]) => {
                    if (results.indexOf(false) !== -1) {
                        return resolve(false);
                    } else {
                        return resolve(true);
                    }
                });
            } else {
                modelData = new this.mongooseModel(data);
                modelData.validate((error) => {
                    if (error) {
                        return resolve(false);
                    } else {
                        return resolve(true);
                    }
                });
            }
        });
    }

}
