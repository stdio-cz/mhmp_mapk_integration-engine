"use strict";

import { CustomError } from "@golemio/errors";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import { DataSourceStreamed } from "../../../src/core/datasources";
import { DataSourceStream } from "../../../src/core/datasources/DataSourceStream";
import { log } from "../../../src/core/helpers/Logger";

import { waitTillStreamEnds } from "../../helpers";

chai.use(chaiAsPromised);

describe("DataSourceStreamed", () => {

    let sandbox;
    let datasource;
    let protocolStub;
    let dataTypeStub;
    let validatorStub;

    beforeEach(() => {

        const getStream = async (data) => {
            const dataStream =  new DataSourceStream({
                objectMode: true,
                read: () => {
                    return;
                },
            });
            dataStream.push(data);
            return dataStream;
          };

        sandbox = sinon.createSandbox();

        protocolStub = {
            getData: sandbox.stub().callsFake(() => {
                return getStream(
                    {
                        message: "test",
                    });
            }),
            getLastModified: sandbox.stub(),
        };
        dataTypeStub = {
            parseData: sandbox.stub().callsFake(() => Object.assign({message: "test"})),
        };
        validatorStub = {
            Validate: sandbox.stub().callsFake(() => true),
        };
        sandbox.spy(log, "warn");

        datasource = new DataSourceStreamed("TestDataSource",
            protocolStub,
            dataTypeStub,
            validatorStub);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should has name method", () => {
        chai.expect(datasource.name).not.to.be.undefined;
    });

    it("should has getAll method", () => {
        chai.expect(datasource.getAll).not.to.be.undefined;
    });

    it("should has getLastModified method", () => {
        chai.expect(datasource.getLastModified).not.to.be.undefined;
    });

    it("should has setProtocolStrategy method", () => {
        chai.expect(datasource.setProtocolStrategy).not.to.be.undefined;
    });

    it("should has setDataTypeStrategy method", () => {
        chai.expect(datasource.setDataTypeStrategy).not.to.be.undefined;
    });

    it("should has setValidator method", () => {
        chai.expect(datasource.setValidator).not.to.be.undefined;
    });

    it("should has proceed method", () => {
        chai.expect(datasource.setValidator).not.to.be.undefined;
    });

    it("should properly get all data", async () => {
        const dataStream = await datasource.getAll();
        let outputData: any;

        dataStream.onDataListeners.push((data) => {
            outputData = data;
            dataStream.push(null);
        });

        datasource.proceed();

        await waitTillStreamEnds(dataStream);

        chai.expect(outputData).to.deep.equal({
            message: "test",
        });
    });

    it("should throws error if data are not valid", async () => {
        validatorStub.Validate =  sandbox.stub().callsFake(() => {
            throw new Error('oh noooooooooooooo')
        });

        datasource.setValidator(validatorStub);

        const dataStream = await datasource.getAll();
        let error = null;

        dataStream.on("error", (err) => {
            error = err;
        });

        dataStream.onDataListeners.push(() => {
            dataStream.push(null);
        });

        datasource.proceed();

        await waitTillStreamEnds(dataStream);
        await chai.expect(error).to.be.an('error')
        await chai.expect(error.cause.message).to.be.equal("oh noooooooooooooo");
    });

    it("should warn if data are empty array", async () => {

        const dataStream = await datasource.getAll();

        // need to init handlers
        dataStream.push("somedata");
        dataTypeStub.parseData = sandbox.stub().callsFake(() => []);
        datasource.setDataTypeStrategy(dataTypeStub);
        dataStream.push("somedata");

        dataStream.push(null);
        datasource.proceed();

        await waitTillStreamEnds(dataStream);
        sandbox.assert.calledOnce(log.warn);
    });

    it("should warn if data are null", async () => {

        const dataStream = await datasource.getAll();

        dataStream.push("somedata");
        dataTypeStub.parseData = sandbox.stub().callsFake(() => null);
        datasource.setDataTypeStrategy(dataTypeStub);
        dataStream.push("somedata");

        dataStream.push(null);
        datasource.proceed();

        await waitTillStreamEnds(dataStream);
        sandbox.assert.calledOnce(log.warn);
    });

    it("should warn if data are empty object", async () => {

        const dataStream = await datasource.getAll();

        dataStream.push("somedata");
        dataTypeStub.parseData = sandbox.stub().callsFake(() => Object.assign({}));
        datasource.setDataTypeStrategy(dataTypeStub);
        dataStream.push("somedata");

        dataStream.push(null);
        datasource.proceed();

        await waitTillStreamEnds(dataStream);
        sandbox.assert.calledOnce(log.warn);
    });

    it("should properly get last modified", async () => {
        const lastMod = await datasource.getLastModified();
        sandbox.assert.calledOnce(protocolStub.getLastModified);
    });

    it("should set protocol strategy", async () => {
        datasource.setProtocolStrategy(null);
        chai.expect(datasource.protocolStrategy).to.be.null;
    });

    it("should set datatype strategy", async () => {
        datasource.setDataTypeStrategy(null);
        chai.expect(datasource.dataTypeStrategy).to.be.null;
    });

    it("should set validator", async () => {
        datasource.setValidator(null);
        chai.expect(datasource.validator).to.be.null;
    });

});
