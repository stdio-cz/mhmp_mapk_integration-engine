"use strict";

import { CustomError } from "@golemio/errors";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import mongoose = require("mongoose");
import { SchemaDefinition } from "mongoose";
import * as sinon from "sinon";
import { MongoConnector } from "../../../src/core/connectors";
import { log } from "../../../src/core/helpers";
import { IMongooseSettings, MongoModel } from "../../../src/core/models";

chai.use(chaiAsPromised);

describe("MongoModel", () => {

    let sandbox;
    let collectionName;
    let schemaObject: SchemaDefinition;
    let settings: IMongooseSettings;
    let model: MongoModel;

    before(async () => {
        await MongoConnector.connect();
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        sandbox.spy(log, "warn");

        collectionName = "test";
        schemaObject = {
            id: { type: Number, required: true },
            property1: { type: String },
            property2: { type: String, required: true },
        };
        settings = {
            identifierPath: "id",
            mongoCollectionName: collectionName,
            outputMongooseSchemaObject: schemaObject,
            savingType: "readOnly",
        };
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
    });

    afterEach(async () => {
        sandbox.restore();
        await mongoose.connection.db.collection(collectionName).deleteMany({});
        await mongoose.connection.db.collection("tmp_" + collectionName).deleteMany({});
    });

    it("should has name", () => {
        expect(model.name).not.to.be.undefined;
    });

    it("should has save method", () => {
        expect(model.save).not.to.be.undefined;
    });

    it("should has updateOneById method", () => {
        expect(model.updateOneById).not.to.be.undefined;
    });

    it("should has truncate method", () => {
        expect(model.truncate).not.to.be.undefined;
    });

    it("should has find method", () => {
        expect(model.find).not.to.be.undefined;
    });

    it("should has findOne method", () => {
        expect(model.findOne).not.to.be.undefined;
    });

    it("should has findOneById method", () => {
        expect(model.findOneById).not.to.be.undefined;
    });

    it("should has aggregate method", () => {
        expect(model.aggregate).not.to.be.undefined;
    });

    it("should has replaceOrigCollectionByTempCollection method", () => {
        expect(model.replaceOrigCollectionByTempCollection).not.to.be.undefined;
    });

    // method model.save()

    it("should throws error if model is read only", async () => {
        await expect(model.save([{ id: 1 }])).to.be.rejectedWith(CustomError);
        await expect(model.save([{ id: 1 }], true)).to.be.rejectedWith(CustomError);
    });

    it("should throws error if data are not valid", async () => {
        await expect(model.save([{ id: 1, property1: "a" }])).to.be.rejectedWith(CustomError);
        await expect(model.save([{ id: 1, property1: "a" }], true)).to.be.rejectedWith(CustomError);
    });

    it("should logs warning if validator is not set", async () => {
        settings.savingType = "insertOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            undefined,
        );
        await expect(model.save([{ id: 1, property1: "a" }])).to.be.rejectedWith(Error);
        await expect(model.save([{ id: 1, property1: "a" }], true)).to.be.rejectedWith(Error);
        sandbox.assert.calledTwice(log.warn);
    });

    it("should throws error when save to tmp model and tmp model is not defined", async () => {
        settings.savingType = "insertOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await expect(model.save([{ id: 1, property1: "a", property2: "b" }], true)).to.be.rejectedWith(CustomError);
    });

    it("should saves one record, type insertOnly, main model", async () => {
        settings.savingType = "insertOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        let data = await model.findOneById(1);
        expect(data).to.have.property("id", 1);
        expect(data).to.have.property("property1", "a");
        expect(data).to.have.property("property2", "b");

        await model.save({ id: 1, property1: "a", property2: "b" });
        data = await model.find({ id: 1 });
        expect(data.length).to.equal(2);
    });

    it("should saves array records, type insertOnly, main model", async () => {
        settings.savingType = "insertOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save([{ id: 1, property1: "a", property2: "b" }, { id: 2, property1: "aa", property2: "bb" }]);
        let data = await model.find({});
        expect(data.length).to.equal(2);

        await model.save([{ id: 1, property1: "a", property2: "b" }]);
        data = await model.find({});
        expect(data.length).to.equal(3);
    });

    it("should saves one record, type insertOnly, tmp model", async () => {
        settings.savingType = "insertOnly";
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        let data = await model.findOneById(1, true);
        expect(data).to.have.property("id", 1);
        expect(data).to.have.property("property1", "a");
        expect(data).to.have.property("property2", "b");

        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        data = await model.find({ id: 1 }, true);
        expect(data.length).to.equal(2);
    });

    it("should saves array records, type insertOnly, tmp model", async () => {
        settings.savingType = "insertOnly";
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save([
            { id: 1, property1: "a", property2: "b" },
            { id: 2, property1: "aa", property2: "bb" }], true);
        let data = await model.find({}, true);
        expect(data.length).to.equal(2);

        await model.save([{ id: 1, property1: "a", property2: "b" }], true);
        data = await model.find({}, true);
        expect(data.length).to.equal(3);
    });

    it("should throws error if updateValues is not set, type insertOrUpdate", async () => {
        settings.savingType = "insertOrUpdate";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await expect(model.save({ id: 1, property1: "a", property2: "b" })).to.be.rejectedWith(CustomError);
    });

    it("should saves one record, type insertOrUpdate, main model", async () => {
        settings.savingType = "insertOrUpdate";
        settings.updateValues = (dbData, newData) => {
            dbData.property1 = newData.property1;
            dbData.property2 = newData.property2;
            return dbData;
        };
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        await model.save({ id: 1, property1: "a", property2: "c" });
        const data = await model.find({ id: 1 });
        expect(data.length).to.equal(1);
        expect(data[0]).to.have.property("id", 1);
        expect(data[0]).to.have.property("property1", "a");
        expect(data[0]).to.have.property("property2", "c");
    });

    it("should saves array records, type insertOrUpdate, main model", async () => {
        settings.savingType = "insertOrUpdate";
        settings.updateValues = (dbData, newData) => {
            dbData.property1 = newData.property1;
            dbData.property2 = newData.property2;
            return dbData;
        };
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save([{ id: 1, property1: "a", property2: "b" }, { id: 2, property1: "aa", property2: "bb" }]);
        await model.save([{ id: 1, property1: "a", property2: "c" }]);
        let data = await model.find({});
        expect(data.length).to.equal(2);

        data = await model.find({ id: 1 });
        expect(data.length).to.equal(1);
        expect(data[0]).to.have.property("id", 1);
        expect(data[0]).to.have.property("property1", "a");
        expect(data[0]).to.have.property("property2", "c");
    });

    it("should saves one record, type insertOrUpdate, tmp model", async () => {
        settings.savingType = "insertOrUpdate";
        settings.updateValues = (dbData, newData) => {
            dbData.property1 = newData.property1;
            dbData.property2 = newData.property2;
            return dbData;
        };
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        await model.save({ id: 1, property1: "a", property2: "c" }, true);
        const data = await model.find({ id: 1 }, true);
        expect(data.length).to.equal(1);
        expect(data[0]).to.have.property("id", 1);
        expect(data[0]).to.have.property("property1", "a");
        expect(data[0]).to.have.property("property2", "c");
    });

    it("should saves array records, type insertOrUpdate, tmp model", async () => {
        settings.savingType = "insertOrUpdate";
        settings.updateValues = (dbData, newData) => {
            dbData.property1 = newData.property1;
            dbData.property2 = newData.property2;
            return dbData;
        };
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save([
            { id: 1, property1: "a", property2: "b" },
            { id: 2, property1: "aa", property2: "bb" }], true);
        await model.save([{ id: 1, property1: "a", property2: "c" }], true);
        let data = await model.find({}, true);
        expect(data.length).to.equal(2);

        data = await model.find({ id: 1 }, true);
        expect(data.length).to.equal(1);
        expect(data[0]).to.have.property("id", 1);
        expect(data[0]).to.have.property("property1", "a");
        expect(data[0]).to.have.property("property2", "c");
    });

    // method model.updateOne()

    it("should throws error if model is read only", async () => {
        await expect(model.updateOne({ id: 1 }, {})).to.be.rejectedWith(CustomError);
        await expect(model.updateOne({ id: 1 }, {}, true)).to.be.rejectedWith(CustomError);
    });

    it("should throws error if data are not valid", async () => {
        settings.savingType = "insertOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        await expect(model.updateOne({ id: 1 }, { property1: { a: 1 } })).to.be.rejectedWith(Error);
        await expect(model.updateOne({ id: 1 }, { property1: { a: 1 } }, true)).to.be.rejectedWith(Error);
    });

    it("should throws error when update tmp model and tmp model is not defined", async () => {
        settings.savingType = "insertOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await expect(model.updateOne({ id: 1 }, { property1: "b", property2: "c" }, true))
            .to.be.rejectedWith(CustomError);
    });

    it("should update values", async () => {
        settings.savingType = "insertOnly";
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        let data = await model.findOneById(1);
        expect(data).to.have.property("property1", "a");
        data = await model.findOneById(1, true);
        expect(data).to.have.property("property1", "a");

        await model.updateOne({ id: 1 }, { $set: { property1: "b" } });
        await model.updateOne({ id: 1 }, { $set: { property1: "b" } }, true);
        data = await model.findOneById(1);
        expect(data).to.have.property("property1", "b");
        data = await model.findOneById(1, true);
        expect(data).to.have.property("property1", "b");
    });

    // method model.updateOneById()

    it("should throws error if model is read only", async () => {
        await expect(model.updateOneById(1, {})).to.be.rejectedWith(CustomError);
        await expect(model.updateOneById(1, {}, true)).to.be.rejectedWith(CustomError);
    });

    it("should throws error if data are not valid", async () => {
        settings.savingType = "insertOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        await expect(model.updateOneById(1, { property1: { a: 1 } })).to.be.rejectedWith(Error);
        await expect(model.updateOneById(1, { property1: { a: 1 } }, true)).to.be.rejectedWith(Error);
    });

    it("should throws error when update tmp model and tmp model is not defined", async () => {
        settings.savingType = "insertOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await expect(model.updateOneById(1, { property1: "b", property2: "c" }, true)).to.be.rejectedWith(CustomError);
    });

    it("should update values", async () => {
        settings.savingType = "insertOnly";
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        let data = await model.findOneById(1);
        expect(data).to.have.property("property1", "a");
        data = await model.findOneById(1, true);
        expect(data).to.have.property("property1", "a");

        await model.updateOneById(1, { $set: { property1: "b" } });
        await model.updateOneById(1, { $set: { property1: "b" } }, true);
        data = await model.findOneById(1);
        expect(data).to.have.property("property1", "b");
        data = await model.findOneById(1, true);
        expect(data).to.have.property("property1", "b");
    });

    // method model.truncate()

    it("should throws error if model is read only", async () => {
        await expect(model.truncate()).to.be.rejectedWith(CustomError);
        await expect(model.truncate(true)).to.be.rejectedWith(CustomError);
    });

    it("should throws error when truncate tmp model and tmp model is not defined", async () => {
        settings.savingType = "insertOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await expect(model.truncate(true)).to.be.rejectedWith(CustomError);
    });

    it("should truncate", async () => {
        settings.savingType = "insertOnly";
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        let data = await model.find({});
        expect(data.length).to.equal(1);
        data = await model.find({}, true);
        expect(data.length).to.equal(1);

        await model.truncate();
        await model.truncate(true);
        data = await model.find({});
        expect(data.length).to.equal(0);
        data = await model.find({}, true);
        expect(data.length).to.equal(0);
    });

    // method model.delete()

    it("should throws error if model is read only", async () => {
        await expect(model.delete({ id: 1 })).to.be.rejectedWith(CustomError);
        await expect(model.delete({ id: 1 }, true)).to.be.rejectedWith(CustomError);
    });

    it("should throws error when delete from tmp model and tmp model is not defined", async () => {
        settings.savingType = "insertOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await expect(model.delete({ id: 1 }, true)).to.be.rejectedWith(CustomError);
    });

    it("should delete", async () => {
        settings.savingType = "insertOnly";
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        let data = await model.find({});
        expect(data.length).to.equal(1);
        data = await model.find({}, true);
        expect(data.length).to.equal(1);

        await model.delete({ id: 1 });
        await model.delete({ id: 1 }, true);
        data = await model.find({});
        expect(data.length).to.equal(0);
        data = await model.find({}, true);
        expect(data.length).to.equal(0);
    });

    // method model.find()

    it("should throws error when find in tmp model and tmp model is not defined", async () => {
        settings.savingType = "readOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await expect(model.find({}, true)).to.be.rejectedWith(CustomError);
    });

    it("should returns an array of records", async () => {
        settings.savingType = "insertOnly";
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        let data = await model.find({});
        expect(data).to.be.an("array");
        expect(data.length).to.equal(1);

        data = await model.find({}, true);
        expect(data).to.be.an("array");
        expect(data.length).to.equal(1);
    });

    // method model.findOne()

    it("should throws error when find in tmp model and tmp model is not defined", async () => {
        settings.savingType = "readOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await expect(model.findOne({}, true)).to.be.rejectedWith(CustomError);
    });

    it("should returns an one object", async () => {
        settings.savingType = "insertOnly";
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        let data = await model.findOne({ id: 1 });
        expect(data).to.be.an("object");

        data = await model.findOne({ id: 1 }, true);
        expect(data).to.be.an("object");
    });

    // method model.findOneById()

    it("should throws error when find in tmp model and tmp model is not defined", async () => {
        settings.savingType = "readOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await expect(model.findOneById(1, true)).to.be.rejectedWith(CustomError);
    });

    it("should returns an one object", async () => {
        settings.savingType = "insertOnly";
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        let data = await model.findOneById(1);
        expect(data).to.be.an("object");

        data = await model.findOneById(1, true);
        expect(data).to.be.an("object");
    });

    it("should throws error if object is not found", async () => {
        settings.savingType = "insertOnly";
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        await expect(model.findOneById(2)).to.be.rejectedWith(CustomError);
        await expect(model.findOneById(2)).to.be.rejectedWith(CustomError);
    });

    // method model.aggregate()

    it("should throws error when find in tmp model and tmp model is not defined", async () => {
        settings.savingType = "readOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await expect(model.aggregate([], true)).to.be.rejectedWith(CustomError);
    });

    it("should returns an array of records", async () => {
        settings.savingType = "insertOnly";
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" });
        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        let data = await model.aggregate([
            { $match: { $and: [{ id: 1 }] } },
            { $sort: { property1: 1 } },
        ]);
        expect(data).to.be.an("array");
        expect(data.length).to.equal(1);

        data = await model.aggregate([
            { $match: { $and: [{ id: 1 }] } },
            { $sort: { property1: 1 } },
        ], true);
        expect(data).to.be.an("array");
        expect(data.length).to.equal(1);
    });

    /*
    // method model.replaceOrigCollectionByTempCollection()
    - spravne prekopiruje kolekce
    */

    it("should throws error if model is read only", async () => {
        await expect(model.replaceOrigCollectionByTempCollection()).to.be.rejectedWith(CustomError);
    });

    it("should throws error when tmp model is not defined", async () => {
        settings.savingType = "insertOnly";
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await expect(model.replaceOrigCollectionByTempCollection()).to.be.rejectedWith(CustomError);
    });

    it("should properly replace collections", async () => {
        settings.savingType = "insertOnly";
        settings.tmpMongoCollectionName = "tmp_" + collectionName;
        model = new MongoModel("Test" + "Model",
            settings,
            new Validator("TestMongoModelValidator", schemaObject),
        );
        await model.save({ id: 1, property1: "a", property2: "b" }, true);
        await model.replaceOrigCollectionByTempCollection();

        const data = await model.findOneById(1);
        expect(data).to.be.an("object");
        await expect(model.findOneById(1, true)).to.be.rejectedWith(CustomError);
    });

});
