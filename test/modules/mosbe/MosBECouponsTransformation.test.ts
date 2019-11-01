"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { MosBECouponsTransformation } from "../../../src/modules/mosbe";

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

describe("MosBECouponsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new MosBECouponsTransformation();
        const buffer = await readFile(__dirname + "/../../data/mosbe_coupons-input.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("MOSBECoupons");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[0]);
        expect(data).to.have.property("coupon_custom_status_id");
        expect(data).to.have.property("coupon_id");
        expect(data).to.have.property("created");
        expect(data).to.have.property("customer_id");
        expect(data).to.have.property("customer_profile_name");
        expect(data).to.have.property("description");
        expect(data).to.have.property("price");
        expect(data).to.have.property("seller_id");
        expect(data).to.have.property("tariff_id");
        expect(data).to.have.property("tariff_int_name");
        expect(data).to.have.property("tariff_name");
        expect(data).to.have.property("tariff_profile_name");
        expect(data).to.have.property("valid_from");
        expect(data).to.have.property("valid_till");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("coupon_custom_status_id");
            expect(data[i]).to.have.property("coupon_id");
            expect(data[i]).to.have.property("created");
            expect(data[i]).to.have.property("customer_id");
            expect(data[i]).to.have.property("customer_profile_name");
            expect(data[i]).to.have.property("description");
            expect(data[i]).to.have.property("price");
            expect(data[i]).to.have.property("seller_id");
            expect(data[i]).to.have.property("tariff_id");
            expect(data[i]).to.have.property("tariff_int_name");
            expect(data[i]).to.have.property("tariff_name");
            expect(data[i]).to.have.property("tariff_profile_name");
            expect(data[i]).to.have.property("valid_from");
            expect(data[i]).to.have.property("valid_till");
        }
    });

});
