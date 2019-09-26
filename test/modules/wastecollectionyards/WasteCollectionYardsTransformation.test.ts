"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { WasteCollectionYardsTransformation } from "../../../src/modules/wastecollectionyards";

chai.use(chaiAsPromised);
import fs from "fs";

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

describe("WasteCollectionYardsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new WasteCollectionYardsTransformation();
        const buffer = await readFile(__dirname + "/../../data/wastecollectionyards-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("WasteCollectionYards");
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
        expect(data.properties).to.have.property("address");
        expect(data.properties).to.have.property("contact");
        expect(data.properties).to.have.property("name");
        expect(data.properties).to.have.property("operating_hours");
        expect(data.properties).to.have.property("operator");
        expect(data.properties).to.have.property("type");
        expect(data.properties).to.have.property("updated_at");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties).to.have.property("id");
            expect(data[i].properties).to.have.property("address");
            expect(data[i].properties).to.have.property("contact");
            expect(data[i].properties).to.have.property("name");
            expect(data[i].properties).to.have.property("operating_hours");
            expect(data[i].properties).to.have.property("operator");
            expect(data[i].properties).to.have.property("type");
            expect(data[i].properties).to.have.property("updated_at");
        }
    });

});
