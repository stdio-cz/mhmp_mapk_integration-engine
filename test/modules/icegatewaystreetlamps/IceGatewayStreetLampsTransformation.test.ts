/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { IceGatewayStreetLampsTransformation } from "../../../src/modules/icegatewaystreetlamps";

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

describe("IceGatewayStreetLampsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new IceGatewayStreetLampsTransformation();
        const buffer = await readFile(__dirname + "/../../data/icegatewaystreetlamps-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("IceGatewayStreetLamps");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[0]);
        expect(data).to.have.property("geometry");
        expect(data).to.have.property("properties");
        expect(data).to.have.property("type");
        expect(data.properties).to.have.property("id");
        expect(data.properties).to.have.property("dim_value");
        expect(data.properties).to.have.property("groups");
        expect(data.properties).to.have.property("lamppost_id");
        expect(data.properties).to.have.property("last_dim_override");
        expect(data.properties).to.have.property("state");
        expect(data.properties.state).to.have.property("description");
        expect(data.properties.state).to.have.property("id");
        expect(data.properties).to.have.property("timestamp");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties).to.have.property("id");
            expect(data[i].properties).to.have.property("dim_value");
            expect(data[i].properties).to.have.property("groups");
            expect(data[i].properties).to.have.property("lamppost_id");
            expect(data[i].properties).to.have.property("last_dim_override");
            expect(data[i].properties).to.have.property("state");
            expect(data[i].properties.state).to.have.property("description");
            expect(data[i].properties.state).to.have.property("id");
            expect(data[i].properties).to.have.property("timestamp");
        }
    });

});
