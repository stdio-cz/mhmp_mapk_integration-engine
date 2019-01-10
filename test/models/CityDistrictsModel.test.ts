/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
const { mongooseConnection } = require("../../src/helpers/MongoConnector");
import CityDistrictsModel from "../../src/models/CityDistrictsModel";

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

describe("CityDistrictsModel", () => {

    let model: CityDistrictsModel;
    let testData;
    let testId: number;
    let testSlug: string;
    let testCoordinates: number[];
    let testCoordinates2: number[];

    before(async () => {
        await mongooseConnection;
        model = new CityDistrictsModel();
        const buffer = await readFile(__dirname + "/../data/citydistricts-transformed.json");
        testData = JSON.parse(Buffer.from(buffer).toString("utf8"));
        testId = 547310;
        testSlug = "praha-cakovice";
        testCoordinates = [ 14.427452087402344, 50.006856414187304 ];
        testCoordinates2 = [ 14.47174072265625, 50.009062884923054 ];
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

    it("should has GetDistrictByCoordinations method", async () => {
        expect(model.GetDistrictByCoordinations).not.to.be.undefined;
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

        it("should returns one record from DB by id", async () => {
            const data = await model.GetOneFromModel(testId);
            const toTest = data.toObject({versionKey: false});
            delete toTest._id;
            expect(toTest).to.be.deep.equal(testData.features[0]);
        });

        it("should returns one record from DB by slug", async () => {
            const data = await model.GetOneFromModel(testSlug);
            const toTest = data.toObject({versionKey: false});
            delete toTest._id;
            expect(toTest).to.be.deep.equal(testData.features[0]);
        });

    });

    describe("GetDistrictByCoordinations", () => {

        it("should returns city district slug", async () => {
            const data = await model.GetDistrictByCoordinations(testCoordinates);
            expect(data).to.be.equal("praha-12");
        });

        it("should returns null if city district was not found", async () => {
            const data = await model.GetDistrictByCoordinations(testCoordinates2);
            expect(data).to.be.null;
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
