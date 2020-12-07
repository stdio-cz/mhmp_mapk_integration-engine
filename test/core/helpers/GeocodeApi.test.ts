"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { GeocodeApi } from "../../../src/core/helpers";

chai.use(chaiAsPromised);

describe("GeocodeApi", () => {

    it("should has getAddressByLatLng method", async () => {
        expect(GeocodeApi.getAddressByLatLng).not.to.be.undefined;
    });

    it("should returns address by lat lng using Open Street Map API", async () => {
        const data = await GeocodeApi.getAddressByLatLng(50.102864, 14.445868); // TODO GeocodeApi should be imho mocked

        expect(data.address_formatted).to.include("Dělnická 213/10");
        expect(data.street_address).to.include("Dělnická 213/10");
        expect(data.address_locality).to.include("Praha");
        expect(data.address_region).to.include("Holešovice");
        expect(data.address_country).to.include("Česká republika");
    });

    it("should throws error if getting address by lat lng using Open Street Map API failed", async () => {
        await expect(GeocodeApi.getAddressByLatLng(null, null)).to.be.rejected;
    });

    it("should returns lat lng by address using Open Street Map API", async () => {
        const data = await GeocodeApi.getGeoByAddress("Dělnická 213/10", "Praha");
        expect(data).to.be.a("array");
        expect(data).to.deep.equal([ 14.4461163, 50.1028934 ]);
    });

    it("should throws error if getting address by lat lng using Open Street Map API failed", async () => {
        await expect(GeocodeApi.getGeoByAddress("aaa", "bbb")).to.be.rejected;
    });

});
