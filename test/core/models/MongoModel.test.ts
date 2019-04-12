/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import { CityDistricts } from "golemio-schema-definitions";
import "mocha";
import { mongooseConnection } from "../../../src/core/connectors";
import { Validator } from "../../../src/core/helpers";
import { MongoModel } from "../../../src/core/models";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe.skip("MongoModel", () => {

    let model: MongoModel;

    before(async () => {
        await mongooseConnection;
        model = new MongoModel(CityDistricts.name + "Model", {
                identifierPath: "properties.id",
                mongoCollectionName: CityDistricts.mongoCollectionName,
                outputMongooseSchemaObject: CityDistricts.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.geometry.coordinates = b.geometry.coordinates;
                    a.properties.name = b.properties.name;
                    a.properties.slug = b.properties.slug;
                    a.properties.timestamp = b.properties.timestamp;
                    return a;
                },
            },
            new Validator(CityDistricts.name + "ModelValidator", CityDistricts.outputMongooseSchemaObject),
        );
    });

    it("should instantiate", () => {
        expect(model).not.to.be.undefined;
    });

    it("should has name", async () => {
        expect(model.name).not.to.be.undefined;
    });

    // TODO doplnit

});
