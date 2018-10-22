"use strict";

import mongoose = require("mongoose");
const log = require("debug")("RefreshTimesModel");
const errorLog = require("debug")("error");

/**
 * Model for accessing the collection with refresh times for all sources and providing info about their values.
 * Provides info about the times when certain collection/entity was last updated (refreshed) in the database in order
 * to decide whether to ask for new fresh data or not.
 *
 * Each entity saved in the database has its own identifier in this collection (CollectionsRefreshTimes) and
 * coresponding datetime when it was last refreshed
 */
export default class RefreshTimesModel {

    public mongooseModel: mongoose.model;
    public name: string;
    public sort;
    public where;

    /**
     * Default constructor. Estabilishes connection to the model in the database.
     */
    constructor() {
        this.name = "CollectionRefreshTimes";
        // Get the model from database. If it doesn"t exist yet, create one according to the schema
        try {
            this.mongooseModel = mongoose.model("CollectionsRefreshTimes");
        } catch (error) {
            this.mongooseModel = mongoose.model("CollectionsRefreshTimes",
                new mongoose.Schema({
                        _collection: { type: String },
                        lastRefresh: { type: Date },
                    }, { bufferCommands: false }));
        }
        this.sort = null;
        this.where = null;
    }

    /**
     * Updates refresh timestamp of data record.
     *
     * @param id Identifier of the data record to be refreshed
     */
    public UpdateLastRefresh = async (id) => {
        const options = { upsert: true, new: true, setDefaultOnInsert: true };
        const update = { lastRefresh: new Date() };
        try {
            return await this.mongooseModel.findOneAndUpdate({ _collection: id }, update, options).exec();
        } catch (err) {
            errorLog(err);
            throw new Error("Error while updating refresh time.");
        }
    }

    /**
     * Provides info about the time when certain collection/entity was last updated (refreshed) in the database
     * in order to decide whether to ask for new fresh data or not.
     *
     * @param id Identifier of the entity (single entry or whole collection) stored in the database for which
     * we want to know its last refresh time
     * @returns A promise with the number - time of the last refresh of the entity
     */
    public GetLastRefreshedTime = async (id): Promise<number> => {
        try {
            const data = await this.mongooseModel.findOne({ _collection: id }).exec();
            if (data) {
                const dbDate = new Date(data.lastRefresh);
                return (dbDate.getTime());
            } else {
                return 0;
            }
        } catch (err) {
            errorLog(err);
        }
    }

    /**
     * Returns IDs of data entries that are expired
     *
     * @param {string} name
     * @param {number} refreshTimeInMinutes
     * @returns {Promise<any>}
     */
    public GetExpiredIds = (name, refreshTimeInMinutes): Promise<any> => {
        const now = new Date();
        let ids = [];

        return this.mongooseModel.find({
            _collection: { $regex: "^" + name + ".*" },
            lastRefresh: { $lt: new Date(now.getTime() - refreshTimeInMinutes * 60000) },
        }).then((data) => {
            if (data) {
                // transform result data to array of ids
                ids = data.map((element) => {
                    const id = element._collection.split(name + "-")[1];
                    return (id === "all") ? 0 : id;
                });
                return ids;
            } else {
                return Promise.reject("Error getting last refresh time from database.");
            }
        }).catch((error) => {
            return Promise.reject("Error getting last refresh time from database.");
        });
    }

    /**
     * Remove old records from refresh times
     *
     * @param {string} name
     * @param {array} ids
     * @returns {Promise<any>}
     */
    public RemoveExpiredIds = (name, ids): Promise<any> => {
        return this.mongooseModel.remove({
            _collection: { $in: ids.map((id) => {
                return (id === 0) ? name + "-all" : name + "-" + id;
            }) },
        });
    }

    /**
     * Data validation
     *
     * @param {any} data
     * @returns {boolean}
     */
    public Validate(data: any) {
        return true;
    }

}
