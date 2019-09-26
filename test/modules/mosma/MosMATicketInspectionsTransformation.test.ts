"use strict";

import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import { MosMATicketInspectionsTransformation } from "../../../src/modules/mosma";

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

describe("MosMATicketInspectionsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new MosMATicketInspectionsTransformation();
        const buffer = await readFile(__dirname + "/../../data/mosma_ticketinspections-input.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("MOSMATicketInspections");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[1]);
        expect(data).to.have.property("date");
        expect(data).to.have.property("lat");
        expect(data).to.have.property("lon");
        expect(data).to.have.property("reason");
        expect(data).to.have.property("result");
        expect(data).to.have.property("user_id");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("date");
            expect(data[i]).to.have.property("reason");
            expect(data[i]).to.have.property("result");
            expect(data[i]).to.have.property("user_id");
        }
    });

});
