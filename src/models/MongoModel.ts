"use strict";

import mongoose = require("mongoose");
import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";
import Validator from "../helpers/Validator";
import { IModel2, IMongooseSettings } from "./IModel2";

export default class MongoModel implements IModel2 {

    /** Model name */
    public name: string;
    /** The schema which contains schemaObject for creating the Mongoose Schema */
    protected schema: mongoose.Schema;
    /** The Mongoose Model */
    protected mongooseModel: mongoose.Model<any>;
    /** The Mongoose Model for temporary collection */
    protected tmpMongooseModel: mongoose.Model<any>;
    /** Validation helper */
    protected validator: Validator;
    /** Path where to look for ID - identifier to search by */
    protected searchPath;
    /** Path to the sub-property which contains the identifier (separated by dot), e.g. "properties.id" */
    protected identifierPath;
    /** Path to the sub-property which contains the results (separated by dot), e.g. "properties" */
    protected resultsPath;
    /** String to specify selection of DB query. */
    protected select;
    /** Type/Strategy of saving the data */
    protected savingType: "insertOnly" | "insertOrUpdate";
    /** Function to specify which values can be updated */
    protected updateValues: (dbData: any, newData: any) => any;

    constructor(name: string, settings: IMongooseSettings, validator: Validator) {
        this.name = name;

        this.schema = new mongoose.Schema(settings.outputMongooseSchemaObject,
            { bufferCommands: false });
        if (settings.modelIndexes) {
            settings.modelIndexes.forEach((i) => {
                this.schema.index(i);
            });
        }

        try {
            this.mongooseModel = mongoose.model(this.name);
        } catch (error) {
            this.mongooseModel = mongoose.model(this.name, this.schema, settings.mongoCollectionName);
        }
        if (settings.tmpMongoCollectionName) {
            try {
                this.tmpMongooseModel = mongoose.model("tmp" + this.name);
            } catch (error) {
                this.tmpMongooseModel = mongoose.model("tmp" + this.name, this.schema, settings.tmpMongoCollectionName);
            }
        }

        this.validator = validator;
        this.savingType = settings.savingType;
        this.updateValues = settings.updateValues || null;
        this.searchPath = (settings.searchPath)
            ? settings.searchPath
            : (id, multiple = false) => (multiple) ? { id: { $in: id } } : { id };
        this.resultsPath = settings.resultsPath || "";
        this.identifierPath = settings.identifierPath || "id";
        this.select = settings.select || "-_id -__v";
    }

    public save = async (data: any, useTmpTable: boolean = false): Promise<any> => {
        // data validation
        await this.validator.Validate(data);

        const model = (!useTmpTable) ? this.mongooseModel : this.tmpMongooseModel;

        switch (this.savingType) {
            case "insertOnly":
                return this.insertOnly(model, data);
            case "insertOrUpdate":
                return this.insertOrUpdate(data, useTmpTable);
            default:
                throw new CustomError("The model saving type was not specified. Data was not saved.",
                    true, this.name, 1024);
        }
    }

    public truncate = async (useTmpTable: boolean = false): Promise<any> => {
        const model = (!useTmpTable) ? this.mongooseModel : this.tmpMongooseModel;
        try {
            await model.deleteMany({}).exec();
        } catch (err) {
            throw new CustomError("Error while truncating data.", true, this.name, 1011, err);
        }
    }

    public replaceOriginalCollectionByTemporaryCollection = async (): Promise<void> => {
        if (!this.tmpMongooseModel) {
            log.warn("Temporary model is not defined.");
            return;
        }

        try {
            await mongoose.connection.db.collection(this.mongooseModel.collection.name)
                .rename("old_" + this.mongooseModel.collection.name);
        } catch (err) {
            log.warn("Collection " + this.mongooseModel.collection.name + "does not exist.");
        }
        try {
            await mongoose.connection.db.collection(this.tmpMongooseModel.collection.name)
                .rename(this.mongooseModel.collection.name);
        } catch (err) {
            log.warn("Collection tmp_" + this.tmpMongooseModel.collection.name + "does not exist.");
        }
        try {
            await mongoose.connection.db.collection("old_" + this.mongooseModel.collection.name)
                .drop();
        } catch (err) {
            log.warn("Collection old_" + this.mongooseModel.collection.name + "does not exist.");
        }
    }

    public find = async (opts: object, useTmpTable: boolean = false): Promise<any> => {
        const model = (!useTmpTable) ? this.mongooseModel : this.tmpMongooseModel;
        try {
            return await model.find(opts);
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    public findOne = async (opts: object, useTmpTable: boolean = false): Promise<any> => {
        const model = (!useTmpTable) ? this.mongooseModel : this.tmpMongooseModel;
        try {
            return await model.findOne(opts);
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    public findOneById = async (id: string|number, useTmpTable: boolean = false): Promise<any> => {
        const model = (!useTmpTable) ? this.mongooseModel : this.tmpMongooseModel;
        try {
            const data = await model.findOne(this.searchPath(id)).exec();
            if (!data) {
                throw new CustomError("Model data was not found.", true, this.name, 1014);
            } else {
                return data;
            }
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    public aggregate = async (aggregation: object, useTmpTable: boolean = false): Promise<any> => {
        const model = (!useTmpTable) ? this.mongooseModel : this.tmpMongooseModel;
        try {
            return model.aggregate(aggregation).exec();
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    protected insertOnly = async (model: mongoose.Model<any>, data: any): Promise<any> => {
        try {
            if (data instanceof Array) {
                return model.insertMany(data);
            } else {
                return model.create(data);
            }
        } catch (err) {
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

    protected insertOrUpdate = async (data: any, useTmpTable: boolean = false): Promise<any> => {
        try {
            if (data instanceof Array) {
                const promises = data.map((item) => {
                    return this.insertOrUpdateOne(item, useTmpTable);
                });
                return Promise.all(promises);
            } else {
                return this.insertOrUpdateOne(data, useTmpTable);
            }
        } catch (err) {
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

    protected insertOrUpdateOne = async (newData: any, useTmpTable: boolean = false) => {
        try {
            let dbData = await this.findOneById(this.getSubElement(this.identifierPath, newData), useTmpTable);
            dbData = this.updateValues(dbData, newData);
            return dbData.save();
        } catch (err) {
            if (err instanceof CustomError && err.code === 1023) {
                return this.mongooseModel.create(newData);
            } else {
                throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
            }
        }
    }

    /**
     * Method that reduces object data by path.
     *
     * @param {string} path Specifies where to look for the unique identifier of the object to find it in the data.
     * @param {object} obj Raw data.
     * @returns {object|array} Filtered data.
     */
    protected getSubElement = (path: string, obj: any): any => {
        if (path === "") {
            return obj;
        } else {
            return path.split(".").reduce((prev, curr) => {
                return prev ? prev[curr] : undefined;
            }, obj || self);
        }
    }
}
