"use strict";

import * as chai from "chai";
import { expect } from "chai";
import { CustomError } from "@golemio/errors";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import * as request from "request-promise";

import { config } from "../../../src/core/config";
import { UnimonitorCemApi } from "../../../src/modules/energetics";

chai.use(chaiAsPromised);

describe("UnimonitorCemApiHelper", () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        sandbox.stub(config.datasources, "UnimonitorCemApiEnergetics").value({
            url: "",
            authCookieName: "SOMEKEY",
            user: "",
            pass: "",
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("createSession should return an auth cookie", async () => {
        sandbox.stub(request, "get").resolves({
            headers: {
                "set-cookie": ["SOMETHING=owo; SOMEKEY=SOMEVALUE;"],
            },
        });

        const { authCookie } = await UnimonitorCemApi.createSession();
        expect(authCookie).to.equal("SOMEKEY=SOMEVALUE");
        // @ts-ignore
        sandbox.assert.calledOnce(request.get);
    });

    it("createSession should just reject", async () => {
        sandbox.stub(request, "get").rejects(new Error("some_error"));

        await expect(UnimonitorCemApi.createSession()).to.be.rejectedWith(CustomError);
        // @ts-ignore
        sandbox.assert.calledOnce(request.get);
    });

    it("terminateSession should call request.get and resolve", async () => {
        sandbox.stub(request, "get").resolves();

        expect(await UnimonitorCemApi.terminateSession('')).to.be.undefined;
        // @ts-ignore
        sandbox.assert.calledOnce(request.get);
    });

    it("terminateSession should call request.get and reject", async () => {
        sandbox.stub(request, "get").rejects(new Error("some_error"));

        await expect(UnimonitorCemApi.terminateSession('')).to.be.rejectedWith(CustomError);
        // @ts-ignore
        sandbox.assert.calledOnce(request.get);
    });

    it("resourceType getter should return an object", () => {
        expect(typeof UnimonitorCemApi.resourceType).to.equal("object");
    });

    it("processAndFilterAuthCookie should return an empty string (cookie header is null)", () => {
        const authCookie = UnimonitorCemApi['processAndFilterAuthCookie'](null, "");

        expect(authCookie).to.equal("");
    });

    it("processAndFilterAuthCookie should return an empty string (cookie name does not match)", () => {
        const cookieHeader = "SOMEAPIKEY=24a24b24c;";
        const cookieName = "NONEXISTENTKEY";
        const authCookie = UnimonitorCemApi['processAndFilterAuthCookie'](cookieHeader, cookieName);

        expect(authCookie).to.equal("");
    });

    it("processAndFilterAuthCookie should return a cookie string with auth token (simple cookie header)", () => {
        const cookieHeader = "SOMEAPIKEY=24a24b24c;";
        const cookieName = "SOMEAPIKEY";
        const authCookie = UnimonitorCemApi['processAndFilterAuthCookie'](cookieHeader, cookieName);

        expect(authCookie).to.equal("SOMEAPIKEY=24a24b24c");
    });

    it("processAndFilterAuthCookie should return a cookie string with auth token (complex cookie header)", () => {
        const cookieHeader = "TEST=2; SOMEAPIKEY=24a24b24c; SOMETHING=somethingelse;";
        const cookieName = "SOMEAPIKEY";
        const authCookie = UnimonitorCemApi['processAndFilterAuthCookie'](cookieHeader, cookieName);

        expect(authCookie).to.equal("SOMEAPIKEY=24a24b24c");
    });

});
