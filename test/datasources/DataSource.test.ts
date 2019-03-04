/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import {
    CityDistricts, Gardens, IceGatewaySensors, IceGatewayStreetLamps, Parkings, ParkingZones,
    Playgrounds, PublicToilets, RopidGTFS, SharedCars, TrafficCameras,
} from "data-platform-schema-definitions";
import "mocha";
import CSVDataTypeStrategy from "../../src/datasources/CSVDataTypeStrategy";
import DataSource from "../../src/datasources/DataSource";
import FTPProtocolStrategy from "../../src/datasources/FTPProtocolStrategy";
import HTTPProtocolStrategy from "../../src/datasources/HTTPProtocolStrategy";
import JSONDataTypeStrategy from "../../src/datasources/JSONDataTypeStrategy";
import Validator from "../../src/helpers/Validator";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const config = require("../../src/config/ConfigLoader");

// TODO tohle je spis test dostupnosti datovych zdroju
// -> napsat test jen pro tridu DataSource
describe("DataSources", () => {

    describe("CityDistricts", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(CityDistricts.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {},
                    method: "GET",
                    url: config.datasources.CityDistricts,
                }),
                new JSONDataTypeStrategy({resultsPath: "features"}),
                new Validator(CityDistricts.name + "DataSource", CityDistricts.datasourceMongooseSchemaObject));
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.a.string;
        });
    });

    describe("IceGatewaySensors", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(IceGatewaySensors.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {
                        Authorization: "Token " + config.datasources.IGToken,
                    },
                    method: "GET",
                    url: config.datasources.IGSensors,
                }),
                new JSONDataTypeStrategy({resultsPath: ""}),
                new Validator(IceGatewaySensors.name + "DataSource", IceGatewaySensors.datasourceMongooseSchemaObject));
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.null;
        });

    });

    describe("IceGatewayStreetLamps", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(IceGatewayStreetLamps.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {
                        Authorization: "Token " + config.datasources.IGToken,
                    },
                    method: "GET",
                    url: config.datasources.IGStreetLamps,
                }),
                new JSONDataTypeStrategy({resultsPath: ""}),
                new Validator(IceGatewayStreetLamps.name + "DataSource",
                    IceGatewayStreetLamps.datasourceMongooseSchemaObject));
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.null;
        });

    });

    describe("ParkingZones", () => {

        let datasource;
        let datasourceTariffs;

        const timeToMinutes = (value: string): number => {
            const arr = value.split(":").map((val) => {
                return Number(val);
            });
            return (arr[0] * 60) + arr[1];
        };

        beforeEach(() => {
            const zonesProtocol = new JSONDataTypeStrategy({resultsPath: "features"});
            zonesProtocol.setFilter((item) => item.properties.TARIFTAB !== null);
            datasource = new DataSource(ParkingZones.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {},
                    method: "GET",
                    url: config.datasources.ParkingZones,
                }),
                zonesProtocol,
                new Validator(ParkingZones.name + "DataSource", ParkingZones.datasourceMongooseSchemaObject));
            datasourceTariffs = new DataSource("ParkingZonesTariffsDataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.ParkingZonesTariffs,
                }),
                new CSVDataTypeStrategy({
                    csvtojsonParams: { noheader: false },
                    subscribe: (json: any) => {
                        json.TIMEFROM = timeToMinutes(json.TIMEFROM);
                        json.TIMETO = timeToMinutes(json.TIMETO);
                        delete json.OBJECTID;
                        json.code = json.CODE;
                        delete json.CODE;
                        json.day = json.DAY;
                        delete json.DAY;
                        json.divisibility = parseInt(json.DIVISIBILITY, 10);
                        delete json.DIVISIBILITY;
                        json.time_from = json.TIMEFROM;
                        delete json.TIMEFROM;
                        json.max_parking_time = parseInt(json.MAXPARKINGTIME, 10);
                        delete json.MAXPARKINGTIME;
                        json.price_per_hour = parseFloat(json.PRICEPERHOUR);
                        delete json.PRICEPERHOUR;
                        json.time_to = json.TIMETO;
                        delete json.TIMETO;
                        return json;
                    },
                }),
                new Validator("ParkingZonesTariffsDataSource", ParkingZones.datasourceTariffsMongooseSchemaObject));
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.a.string;
        });

        it("should returns all tariffs objects", async () => {
            const data = await datasourceTariffs.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns tariffs last modified", async () => {
            const data = await datasourceTariffs.getLastModified();
            expect(data).to.be.a.string;
        });
    });

    describe("RopidGTFS", () => {

        let datasource;
        let datasourceCisStops;

        beforeEach(() => {
            datasource = new DataSource(RopidGTFS.name + "DataSource",
                new FTPProtocolStrategy({
                    filename: config.datasources.RopidGTFSFilename,
                    isCompressed: true,
                    path: config.datasources.RopidGTFSPath,
                    url: config.datasources.RopidFTP,
                    whitelistedFiles: [
                        "agency.txt", "calendar.txt", "calendar_dates.txt",
                        "shapes.txt", "stop_times.txt", "stops.txt", "routes.txt", "trips.txt",
                    ],
                }),
                new JSONDataTypeStrategy({resultsPath: ""}),
                null);
            datasourceCisStops = new DataSource(RopidGTFS.name + "CisStops",
                new FTPProtocolStrategy({
                    filename: config.datasources.RopidGTFSCisStopsFilename,
                    path: config.datasources.RopidGTFSCisStopsPath,
                    url: config.datasources.RopidFTP,
                }),
                new JSONDataTypeStrategy({resultsPath: "stopGroups"}),
                null);
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.a.string;
        });

        it("should returns all cis objects", async () => {
            const data = await datasourceCisStops.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns cis last modified", async () => {
            const data = await datasourceCisStops.getLastModified();
            expect(data).to.be.a.string;
        });

    });

    describe("TSKParkings", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(Parkings.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {},
                    method: "GET",
                    url: config.datasources.TSKParkings,
                }),
                new JSONDataTypeStrategy({resultsPath: "results"}),
                new Validator(Parkings.name + "DataSource", Parkings.datasourceMongooseSchemaObject));
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.null;
        });

    });

    describe("TSKTrafficCameras", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(TrafficCameras.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {},
                    method: "GET",
                    url: config.datasources.TSKTrafficCameras,
                }),
                new JSONDataTypeStrategy({resultsPath: "results"}),
                new Validator(TrafficCameras.name + "DataSource", TrafficCameras.datasourceMongooseSchemaObject));
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.null;
        });

    });

    describe("CeskyCarsharingSharedCars", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(SharedCars.ceskyCarsharing.name + "DataSource",
                new HTTPProtocolStrategy({
                    body: JSON.stringify(config.datasources.CeskyCarsharingSharedCarsEndpointCredentials),
                    headers: {
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    url: config.datasources.CeskyCarsharingSharedCars,
                }),
                new JSONDataTypeStrategy({resultsPath: "cars"}),
                new Validator(SharedCars.ceskyCarsharing.name + "DataSource",
                    SharedCars.ceskyCarsharing.datasourceMongooseSchemaObject));
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.null;
        });

    });

    describe("HoppyGoSharedCars", () => {

        let datasource;

        beforeEach(() => {
            const hoppyGoDataType = new JSONDataTypeStrategy({resultsPath: ""});
            hoppyGoDataType.setFilter((item) => item.localization !== null);
            datasource = new DataSource(SharedCars.hoppyGo.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {},
                    method: "GET",
                    url: config.datasources.HoppyGoSharedCars,
                }),
                hoppyGoDataType,
                new Validator(SharedCars.hoppyGo.name + "DataSource",
                    SharedCars.hoppyGo.datasourceMongooseSchemaObject));
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.null;
        });

    });

    describe("Gardens", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(Gardens.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {
                        Authorization: "Basic " + config.MOJEPRAHA_ENDPOINT_APIKEY,
                    },
                    method: "GET",
                    url: config.datasources.Gardens,
                }),
                new JSONDataTypeStrategy({resultsPath: ""}),
                new Validator(Gardens.name + "DataSource", Gardens.datasourceMongooseSchemaObject));
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.null;
        });

    });

    describe("Playgrounds", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(Playgrounds.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {},
                    method: "GET",
                    url: config.datasources.Playgrounds,
                }),
                new JSONDataTypeStrategy({resultsPath: "items"}),
                new Validator(Playgrounds.name + "DataSource", Playgrounds.datasourceMongooseSchemaObject));
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.null;
        });

    });

    describe("PublicToilets", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(PublicToilets.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {},
                    method: "GET",
                    url: config.datasources.PublicToilets,
                }),
                new JSONDataTypeStrategy({resultsPath: "features"}),
                new Validator(PublicToilets.name + "DataSource", PublicToilets.datasourceMongooseSchemaObject));
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.not.null;
        });

    });

});
