/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { MosMATicketPurchasesTransformation } from "../../../src/modules/mosma";

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

describe("MosMATicketPurchasesTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new MosMATicketPurchasesTransformation();
        const buffer = await readFile(__dirname + "/../../data/mosma_ticketpurchases-input.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("MOSMATicketPurchases");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[0]);
        expect(data).to.have.property("account_id");
        expect(data).to.have.property("cptp");
        expect(data).to.have.property("date");
        expect(data).to.have.property("duration");
        expect(data).to.have.property("lat");
        expect(data).to.have.property("lon");
        expect(data).to.have.property("tariff_id");
        expect(data).to.have.property("tariff_name");
        expect(data).to.have.property("ticket_id");
        expect(data).to.have.property("zone_count");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[0]).to.have.property("account_id");
            expect(data[0]).to.have.property("cptp");
            expect(data[0]).to.have.property("date");
            expect(data[0]).to.have.property("duration");
            expect(data[0]).to.have.property("lat");
            expect(data[0]).to.have.property("lon");
            expect(data[0]).to.have.property("tariff_id");
            expect(data[0]).to.have.property("tariff_name");
            expect(data[0]).to.have.property("ticket_id");
            expect(data[0]).to.have.property("zone_count");
        }
    });

});
