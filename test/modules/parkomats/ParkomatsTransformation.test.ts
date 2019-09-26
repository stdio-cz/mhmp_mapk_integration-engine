"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { ParkomatsTransformation } from "../../../src/modules/parkomats";

chai.use(chaiAsPromised);
const fs = require("fs");

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

describe("ParkomatsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new ParkomatsTransformation();
        const buffer = await readFile(__dirname + "/../../data/parkomats-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("Parkomats");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element with object keys", async () => {
        const data = await transformation.transform(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("channel");
            expect(data[i]).to.have.property("parking_zone");
            expect(data[i]).to.have.property("price");
            expect(data[i]).to.have.property("ticket_bought");
            expect(data[i]).to.have.property("transaction_id");
            expect(data[i]).to.have.property("validity_from");
            expect(data[i]).to.have.property("validity_to");
        }
    });
});
