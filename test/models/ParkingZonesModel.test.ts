/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
const { mongooseConnection } = require("../../src/helpers/MongoConnector");
import ParkingZonesModel from "../../src/models/ParkingZonesModel";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const fs = require("fs");

chai.use(chaiAsPromised);

const readFile = (file: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(file);
        const chunks = [];

        stream.on("error", (err) => {
            reject(err);
        });
        stream.on("data", (data) => {
            chunks.push(data);
        });
        stream.on("close", () => {
            resolve(Buffer.concat(chunks));
        });
    });
};

describe("ParkingZonesModel", () => {

    let model: ParkingZonesModel;
    let testData;
    let testId;

    before(async () => {
        await mongooseConnection;
        model = new ParkingZonesModel();
        const buffer = await readFile(__dirname + "/../data/parkingzones-transformed.json");
        testData = JSON.parse(Buffer.from(buffer).toString("utf8"));
        testId = "P1-0101";
    });

    it("should instantiate", () => {
        expect(model).not.to.be.undefined;
    });

    it("should has name", async () => {
        expect(model.name).not.to.be.undefined;
    });

    it("should has GetOneFromModel method", async () => {
        expect(model.GetOneFromModel).not.to.be.undefined;
    });

    it("should has SaveToDb method", async () => {
        expect(model.SaveToDb).not.to.be.undefined;
    });

    it("should has Truncate method", async () => {
        expect(model.Truncate).not.to.be.undefined;
    });

    describe("SaveToDb", () => {

        it("should saves test data to DB", async () => {
            await expect(model.SaveToDb(testData)).to.be.fulfilled;
            const data = await model.GetOneFromModel(testId);
            const toTest = data.toObject({versionKey: false});
            delete toTest._id;
            expect(toTest).to.be.deep.equal(testData.features[0]);
        });

    });

    describe("GetOneFromModel", () => {

        it("should returns one record from DB", async () => {
            const data = await model.GetOneFromModel(testId);
            const toTest = data.toObject({versionKey: false});
            delete toTest._id;
            expect(toTest).to.be.deep.equal(testData.features[0]);
        });

    });

    describe("Truncate", () => {

        it("should deletes all records from DB", async () => {
            const data = await model.GetOneFromModel(testId);
            const toTest = data.toObject({versionKey: false});
            delete toTest._id;
            expect(toTest).to.be.deep.equal(testData.features[0]);
            await model.Truncate();
            await expect(model.GetOneFromModel(testId)).to.be.rejected;
        });

    });

});
