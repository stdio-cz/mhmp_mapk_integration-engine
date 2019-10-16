"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import { HomeportLocationsTransformation } from "../../../src/modules/sharedbikes";

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

describe("HomeportLocationsTransformation", () => {

    let transformation;
    let testSourceData;
    let sandbox;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();

        transformation = new HomeportLocationsTransformation();
        const buffer = await readFile(__dirname + "/../../data/homeport_locations_sharedbikes-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));

        sandbox.stub(transformation.settingsDatasource, "getAll")
            .callsFake(() => Object.assign({ FreebikeBatteryRangeCorrection: 10 }));
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("HomeportSharedBikesLocations");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties.company).to.have.property("name");
            expect(data[i].properties.company).to.have.property("web");
            expect(data[i].properties).to.have.property("id");
            expect(data[i].properties).to.have.property("in_rack");
            expect(data[i].properties).to.have.property("in_rack");
            expect(data[i].properties).to.have.property("location_note");
            expect(data[i].properties).to.have.property("name");
            expect(data[i].properties).to.have.property("res_url");
            expect(data[i].properties.type).to.have.property("description");
            expect(data[i].properties.type).to.have.property("id");
            expect(data[i].properties).to.have.property("updated_at");
        }
        sandbox.assert.calledOnce(transformation.settingsDatasource.getAll);
    });

});
