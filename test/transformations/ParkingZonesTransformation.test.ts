/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import * as path from "path";
import ParkingZonesTransformation from "../../src/transformations/ParkingZonesTransformation";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const fs = require("fs");

chai.use(chaiAsPromised);

fs.readFileAsync = (filename) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};

describe("ParkingZonesTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(() => {
        transformation = new ParkingZonesTransformation();
        beforeEach(async () => {
            const buffer = await fs.readFileAsync(__dirname + "/../data/parking-zones-datasource.json");
            testSourceData = JSON.parse(buffer.toString());
        });
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("ParkingZones");
    });
/*
    it("test", async () => {
        const merge = (ranges) => {
            const result = [];
            let last;
            ranges.forEach((r) => {
                if (!last || r[0] > last[1]) {
                    result.push(last = r);
                } else if (r[1] > last[1]) {
                    last[1] = r[1];
                }
            });
            return result;
        };
        const toMinutes = (time) => {
            const ary = time.split(":");
            return (parseInt(ary[0], 10) * 60) + (parseInt(ary[1], 10));
        };
        const toMinutesInterval = (from, to) => {
            const f = toMinutes(from);
            const t = toMinutes(to);
            return [from, (from < to) ? to : to + 1440];
        };
    });
*/

    it("should has TransformDataElement method", async () => {
        expect(transformation.TransformDataElement).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.TransformDataElement(testSourceData.features[0]);
        expect(data).to.have.property("geometry");
        expect(data).to.have.property("properties");
        expect(data).to.have.property("type");
        expect(data.properties).to.have.property("code");
        expect(data.properties).to.have.property("midpoint");
        expect(data.properties).to.have.property("northeast");
        expect(data.properties).to.have.property("southwest");
        expect(data.properties).to.have.property("name");
        expect(data.properties).to.have.property("number_of_places");
        expect(data.properties).to.have.property("payment_link");
        expect(data.properties).to.have.property("tariffs");
        expect(data.properties).to.have.property("timestamp");
        expect(data.properties).to.have.property("type");
        expect(data.properties).to.have.property("zps_id");
    });

    it("should has TransformDataCollection method", async () => {
        expect(transformation.TransformDataCollection).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.TransformDataCollection(testSourceData.features);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties).to.have.property("code");
            expect(data[i].properties).to.have.property("midpoint");
            expect(data[i].properties).to.have.property("northeast");
            expect(data[i].properties).to.have.property("southwest");
            expect(data[i].properties).to.have.property("name");
            expect(data[i].properties).to.have.property("number_of_places");
            expect(data[i].properties).to.have.property("payment_link");
            expect(data[i].properties).to.have.property("tariffs");
            expect(data[i].properties).to.have.property("timestamp");
            expect(data[i].properties).to.have.property("type");
            expect(data[i].properties).to.have.property("zps_id");
        }
    });

});
