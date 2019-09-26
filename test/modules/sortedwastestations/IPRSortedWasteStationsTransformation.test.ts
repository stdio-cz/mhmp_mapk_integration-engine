"use strict";

import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import { IPRSortedWasteStationsTransformation } from "../../../src/modules/sortedwastestations";

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

describe("IPRSortedWasteStationsTransformation", () => {

    let transformation;
    let testSourceDataContainers;
    let testSourceDataStations;

    beforeEach(async () => {
        transformation = new IPRSortedWasteStationsTransformation();
        let buffer = await readFile(__dirname + "/../../data/ipr_sortedwastestations_stations-datasource.json");
        testSourceDataStations = JSON.parse(Buffer.from(buffer).toString("utf8"));
        buffer = await readFile(__dirname + "/../../data/ipr_sortedwastestations_containers-datasource.json");
        testSourceDataContainers = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("IPRSortedWasteStations");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        transformation.setContainers(testSourceDataContainers);
        const data = await transformation.transform(testSourceDataStations);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties).to.have.property("id");
            expect(data[i].properties).to.have.property("name");
            expect(data[i].properties).to.have.property("accessibility");
            expect(data[i].properties.accessibility).to.have.property("description");
            expect(data[i].properties.accessibility).to.have.property("id");
            expect(data[i].properties).to.have.property("containers");
            expect(data[i].properties.containers).to.be.an("array");
            expect(data[i].properties.containers[0]).to.have.property("trash_type");
            expect(data[i].properties).to.have.property("updated_at");
        }
    });

});
