"use strict";

import mongoose = require("mongoose");
import { getSubProperty, log, Validator } from "../helpers";
import { CustomError } from "../helpers/errors";
import { IModel, IMongooseSettings } from "./";

export class MongoModel implements IModel {

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
    protected savingType: "readOnly" | "insertOnly" | "insertOrUpdate";
    /** Function to specify which values can be updated */
    protected updateValues: (dbData: any, newData: any) => any;

    constructor(name: string, settings: IMongooseSettings, validator: Validator) {
        this.name = name;

        this.schema = new mongoose.Schema(settings.outputMongooseSchemaObject,
            { bufferCommands: false });
        this.schema.index({ [settings.identifierPath]: 1 });
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
        this.identifierPath = settings.identifierPath;
        this.select = settings.select || "-_id -__v";
    }

    public save = async (data: any, useTmpTable: boolean = false): Promise<any> => {
        if (this.savingType === "readOnly") {
            throw new CustomError("The model saving type is read only.", true, this.name);
        }

        // data validation
        if (this.validator) {
            await this.validator.Validate(data);
        } else {
            log.warn(this.name + ": Model validator is not set.");
        }

        const model = this.getMongooseModelSafely(useTmpTable);

        // calling the method based on savingType (this.insertOnly() or this.insertOrUpdate())
        return this[this.savingType](model, data);
    }

    public updateOne = async (opts: any, data: any, useTmpTable: boolean = false): Promise<any> => {
        if (this.savingType === "readOnly") {
            throw new CustomError("The model saving type is read only.", true, this.name);
        }

        const model = this.getMongooseModelSafely(useTmpTable);
        return model.updateOne(opts, data, { runValidators: true }).exec();
    }

    public updateOneById = async (id: any, data: any, useTmpTable: boolean = false): Promise<any> => {
        if (this.savingType === "readOnly") {
            throw new CustomError("The model saving type is read only.", true, this.name);
        }

        const model = this.getMongooseModelSafely(useTmpTable);
        return model.updateOne(this.searchPath(id), data, { runValidators: true }).exec();
    }

    public truncate = async (useTmpTable: boolean = false): Promise<any> => {
        if (this.savingType === "readOnly") {
            throw new CustomError("The model saving type is read only.", true, this.name);
        }

        const model = this.getMongooseModelSafely(useTmpTable);
        try {
            await model.deleteMany({}).exec();
        } catch (err) {
            throw new CustomError("Error while truncating data.", true, this.name, 1011, err);
        }
    }

    public delete = async (opts: object, useTmpTable: boolean = false): Promise<any> => {
        if (this.savingType === "readOnly") {
            throw new CustomError("The model saving type is read only.", true, this.name);
        }

        const model = this.getMongooseModelSafely(useTmpTable);
        try {
            return await model.deleteMany(opts).exec();
        } catch (err) {
            throw new CustomError("Error while deleting data.", true, this.name, 1011, err);
        }
    }

    public find = async (opts: object, useTmpTable: boolean = false): Promise<any> => {
        const model = this.getMongooseModelSafely(useTmpTable);
        try {
            return await model.find(opts);
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    public findOne = async (opts: object, useTmpTable: boolean = false): Promise<any> => {
        const model = this.getMongooseModelSafely(useTmpTable);
        try {
            return await model.findOne(opts);
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    public findOneById = async (id: string | number, useTmpTable: boolean = false): Promise<any> => {
        const model = this.getMongooseModelSafely(useTmpTable);
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

    public aggregate = async (aggregation: any[], useTmpTable: boolean = false): Promise<any> => {
        const model = this.getMongooseModelSafely(useTmpTable);
        try {
            return model.aggregate(aggregation).exec();
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    public replaceOrigCollectionByTempCollection = async (): Promise<void> => {
        if (this.savingType === "readOnly") {
            throw new CustomError("The model saving type is read only.", true, this.name);
        }

        if (!this.tmpMongooseModel) {
            throw new CustomError("Temporary model is not defined.", true, this.name);
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

    private insertOnly = async (model: mongoose.Model<any>, data: any): Promise<any> => {
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

    private insertOrUpdate = async (model: mongoose.Model<any>, data: any): Promise<any> => {
        try {
            if (data instanceof Array) {
                const promises = data.map((item) => {
                    return this.insertOrUpdateOne(model, item);
                });
                return Promise.all(promises);
            } else {
                return this.insertOrUpdateOne(model, data);
            }
        } catch (err) {
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

    private insertOrUpdateOne = async (model: mongoose.Model<any>, newData: any) => {
        if (!this.updateValues) {
            throw new CustomError("Method updateValues() is not defined.", true, this.name);
        }
        try {
            let dbData = await model.findOne(this.searchPath(getSubProperty(this.identifierPath, newData))).exec();
            if (!dbData) {
                throw new CustomError("Model data was not found.", true, this.name, 1014);
            }
            dbData = this.updateValues(dbData, newData);
            dbData.markModified("properties"); // TODO zkontrolovat jestli funguje na vsechny pripady
            return dbData.save();
        } catch (err) {
            if (err instanceof CustomError && err.code === 1014) {
                return model.create(newData);
            } else {
                throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
            }
        }
    }

    private getMongooseModelSafely = (useTmpTable: boolean): mongoose.Model<any> => {
        let model = this.mongooseModel;
        if (useTmpTable && this.tmpMongooseModel) {
            model = this.tmpMongooseModel;
        } else if (useTmpTable && !this.tmpMongooseModel) {
            throw new CustomError("Temporary model is not defined.", true, this.name);
        }
        return model;
    }

}
