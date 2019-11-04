"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { RopidGTFSTransformation } from "../../../src/modules/ropidgtfs";

chai.use(chaiAsPromised);
import * as fs from "fs";

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

describe("RopidGTFSTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new RopidGTFSTransformation();
        const buffer = await readFile(__dirname + "/../../data/ropidgtfs-data.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("RopidGTFS");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData);
        expect(data).to.have.property("name");
        expect(data).to.have.property("data");
        expect(data).to.have.property("total");
    });

});