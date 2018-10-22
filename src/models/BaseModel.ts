"use strict";

import mongoose = require("mongoose");
import ISchema from "../schemas/ISchema";
import RefreshTimesModel from "./RefreshTimesModel";

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
    /** Model for working with database refresh times */
    protected refreshTimesModel: RefreshTimesModel;

    constructor() {
        this.refreshTimesModel = new RefreshTimesModel();
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

    /**
     * Retrieves the data from the database.
     *
     * @param limit
     * @param offset
     */
    public GetAll = async (limit = null, offset = null) => {
        try {
            // Get all data from the db
            const q = this.mongooseModel.find();
            if (limit) {
                q.limit(parseInt(limit, 10));
            }
            if (offset) {
                q.skip(parseInt(offset, 10));
            }
            if (this.where) {
                q.where(this.where);
            }
            if (this.sort) {
                q.sort(this.sort);
            }
            let data = await q.select(this.select).exec();
            // Create the output Collection from the data e.g. geoJSON features collection
            if (this.createOutputCollection) {
                data = this.createOutputCollection(data);
            }
            if (!this.Validate(data)) {
                throw new Error("Response data is not valid.");
            } else {
                return data;
            }
        } catch (err) {
            if (err instanceof Error) {
                throw err;
            } else {
                throw new Error("Database is not available: " + err);
            }
        }
    }

    /**
     * Retrieves the data from the database.
     *
     * @param id
     */
    public GetOne = async (id) => {
        try {
            const data = await this.mongooseModel.findOne(this.searchPath(id))
                .select(this.select).exec();
            if (!data) {
                throw new Error("Not Found");
            } else {
                if (!this.Validate(data)) {
                    throw new Error("Response data is not valid.");
                } else {
                    return data;
                }
            }
        } catch (err) {
            if (err instanceof Error) {
                throw err;
            } else {
                throw new Error("Database is not available: " + err);
            }
        }
    }

    /**
     * Removes old records in DB (cache DB)
     * Old records are removed if its real refreshed time in DB is older then its refreshed time set in config and
     * the reload of the resource was completed
     *
     * @returns {Promise<any>}
     */
    public RemoveOldRecords = async (refreshTimeInMinutes: number): Promise<any> => {
        try {
            const ids = await this.refreshTimesModel.GetExpiredIds(this.name, refreshTimeInMinutes);
            const removed = await this.mongooseModel.remove(this.searchPath(ids, true));
            const removedIds = await this.refreshTimesModel.RemoveExpiredIds(this.name, ids);
            return { name: this.name, records: ids };
        } catch (err) {
            return err;
        }
    }

    /**
     * Data validation
     *
     * @param {any} data
     * @returns {boolean}
     */
    // TODO: Add validation of FeatureCollection itself,
    // now checks only if it's type FeatureCollection and has features array
    public Validate = (data: any): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            if (data instanceof Object && data.type === "FeatureCollection" && data.features instanceof Array) {
                data = data.features;
            }
            if (data instanceof Array) {
                if (data.length === 0) {
                    return resolve(true);
                } else {
                    const promises = data.map((element) => {
                        return this.ValidateElement(element);
                    });
                    return Promise.all(promises).then((elemResults) => {
                        if (elemResults.indexOf(false) !== -1) {
                            return resolve(false);
                        } else {
                            return resolve(true);
                        }
                    });
                }
            } else {
                return this.ValidateElement(data).then((res) => {
                    resolve(res);
                });
            }
        });
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
