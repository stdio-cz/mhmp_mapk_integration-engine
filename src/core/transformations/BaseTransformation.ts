"use strict";

import { CustomError } from "../helpers/errors";
import { ITransformation } from "./";

export abstract class BaseTransformation implements ITransformation {

    /** Transformation name */
    public abstract name: string;
    /** Transform one single element from input format (from data source) to output format */
    protected abstract transformElement: (element: any) => Promise<any>;

    /**
     * Transform the whole collection or one single element
     */
    public transform = async (data: any|any[]): Promise<any|any[]> => {
        if (data instanceof Array) {
            const promises = data.map((element) => {
                return this.transformElement(element);
            });
            const results = await Promise.all(promises);
            return results.filter((r) => r !== null);
        } else {
            return this.transformElement(data);
        }
    }

    /**
     * Transform the whole collection or one single element as history
     */
    public transformHistory = async (data: any|any[]): Promise<any|any[]> => {
        if (data instanceof Array) {
            const promises = data.map((element) => {
                return this.transformHistoryElement(element);
            });
            const results = await Promise.all(promises);
            return results.filter((r) => r !== null);
        } else {
            return this.transformHistoryElement(data);
        }
    }

    /**
     * Transform one single element from input format (from data source) to output history format
     */
    protected transformHistoryElement = async (element: any): Promise<any> => {
        throw new CustomError("Method is not implemented.", true, this.constructor.name, 1025);
    }

}
