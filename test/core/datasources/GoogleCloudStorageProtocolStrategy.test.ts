"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import { RedisConnector } from "../../../src/core/connectors";
import { GoogleCloudStorageProtocolStrategy, IGoogleCloudStorageSettings } from "../../../src/core/datasources";

chai.use(chaiAsPromised);

describe("PostgresProtocolStrategy", () => {

    let sandbox;
    let testSettings: IGoogleCloudStorageSettings;
    let strategy;

    before(async () => {
        await RedisConnector.connect();
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        testSettings = {
            bucketName: "test",
            keyFilename: "test",
        };
        strategy = new GoogleCloudStorageProtocolStrategy(testSettings);

        sandbox.stub(strategy.storage, "bucket").callsFake(() => Object.assign({
            file: sandbox.stub().callsFake(() => Object.assign({
                download: sandbox.stub().callsFake(() => [Buffer.from("a,b\n1,2", "utf16le")]),
            })),
            getFiles: sandbox.stub().callsFake(() => [[{name: "a"}, {name: "b"}]]),
        }));

    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should has getData method", async () => {
        expect(strategy.getData).not.to.be.undefined;
    });

    it("should has getLastModified method", async () => {
        expect(strategy.getLastModified).not.to.be.undefined;
    });

    it("should has setConnectionSettings method", async () => {
        expect(strategy.setConnectionSettings).not.to.be.undefined;
    });

    it("should properly get data", async () => {
        const res = await strategy.getData();
        expect(res).to.be.deep.equal([{ filepath: "test/a", name: "a" }, { filepath: "test/b", name: "b" }]);
    });

});
