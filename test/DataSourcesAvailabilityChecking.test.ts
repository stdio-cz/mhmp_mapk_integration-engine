/// <reference path="../node_modules/@types/node/index.d.ts" />

"use strict";

import {
    AirQualityStations, BicycleParkings, CityDistricts, Gardens, IceGatewaySensors, IceGatewayStreetLamps,
    MedicalInstitutions, Meteosensors, MunicipalAuthorities, MunicipalPoliceStations, Parkings, ParkingZones,
    Playgrounds, PublicToilets, RopidGTFS, SharedBikes, SharedCars, SortedWasteStations, TrafficCameras,
    WasteCollectionYards, ZtpParkings,
} from "golemio-schema-definitions";
import "mocha";
import { config } from "../src/core/config";
import { RedisConnector } from "../src/core/connectors";
import {
    CSVDataTypeStrategy, DataSource, FTPProtocolStrategy, HTTPProtocolStrategy,
    JSONDataTypeStrategy, XMLDataTypeStrategy,
} from "../src/core/datasources";
import { ObjectKeysValidator, Validator } from "../src/core/helpers";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("DataSourcesAvailabilityChecking", () => {

    before(async () => {
        await RedisConnector.connect();
    });

    describe("CityDistricts", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(CityDistricts.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.CityDistricts,
                }),
                new JSONDataTypeStrategy({ resultsPath: "features" }),
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
                    headers: {
                        Authorization: "Token " + config.datasources.IGToken,
                    },
                    method: "GET",
                    url: config.datasources.IGSensors,
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
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
                    headers: {
                        Authorization: "Token " + config.datasources.IGToken,
                    },
                    method: "GET",
                    url: config.datasources.IGStreetLamps,
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
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

        beforeEach(() => {
            const zonesProtocol = new JSONDataTypeStrategy({ resultsPath: "features" });
            zonesProtocol.setFilter((item) => item.properties.TARIFTAB);
            datasource = new DataSource(ParkingZones.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.ParkingZones,
                }),
                zonesProtocol,
                new Validator(ParkingZones.name + "DataSource", ParkingZones.datasourceMongooseSchemaObject));
            datasourceTariffs = new DataSource("ParkingZonesTariffsDataSource",
                new HTTPProtocolStrategy({
                    headers: {
                        authorization: config.datasources.ParkingZonesTariffsAuth,
                    },
                    json: true,
                    method: "GET",
                    url: config.datasources.ParkingZonesTariffs + "P1-0133",
                }),
                new JSONDataTypeStrategy({ resultsPath: "dailyTariff" }),
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
            expect(data).to.be.null;
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
                    tmpDir: "/tmp/",
                    url: config.datasources.RopidFTP,
                    whitelistedFiles: [
                        "agency.txt", "calendar.txt", "calendar_dates.txt",
                        "shapes.txt", "stop_times.txt", "stops.txt", "routes.txt", "trips.txt",
                    ],
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                null);
            datasourceCisStops = new DataSource(RopidGTFS.name + "CisStops",
                new FTPProtocolStrategy({
                    filename: config.datasources.RopidGTFSCisStopsFilename,
                    path: config.datasources.RopidGTFSCisStopsPath,
                    tmpDir: "/tmp/",
                    url: config.datasources.RopidFTP,
                }),
                new JSONDataTypeStrategy({ resultsPath: "stopGroups" }),
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
                    headers: {},
                    method: "GET",
                    url: config.datasources.TSKParkings,
                }),
                new JSONDataTypeStrategy({ resultsPath: "results" }),
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
                    headers: {},
                    method: "GET",
                    url: config.datasources.TSKTrafficCameras,
                }),
                new JSONDataTypeStrategy({ resultsPath: "results" }),
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

    describe("TSKZtpParkings", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(ZtpParkings.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {
                        user_key: config.datasources.TSKZtpParkingsToken,
                    },
                    method: "GET",
                    url: config.datasources.TSKZtpParkings,
                }),
                new JSONDataTypeStrategy({ resultsPath: "data" }),
                new ObjectKeysValidator(ZtpParkings.name + "DataSource", ZtpParkings.datasourceMongooseSchemaObject));
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

    describe("SharedCars", () => {

        describe("CeskyCarsharing", () => {

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
                    new JSONDataTypeStrategy({ resultsPath: "cars" }),
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

        describe("HoppyGo", () => {

            let datasource;

            beforeEach(() => {
                const hoppyGoDataType = new JSONDataTypeStrategy({ resultsPath: "" });
                hoppyGoDataType.setFilter((item) => item.localization);
                datasource = new DataSource(SharedCars.hoppyGo.name + "DataSource",
                    new HTTPProtocolStrategy({
                        headers: {},
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
    });

    describe("Gardens", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(Gardens.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {
                        Authorization: "Basic " + config.MOJEPRAHA_ENDPOINT_APIKEY,
                    },
                    method: "GET",
                    url: config.datasources.Gardens,
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
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
                    headers: {},
                    method: "GET",
                    url: config.datasources.Playgrounds,
                }),
                new JSONDataTypeStrategy({ resultsPath: "items" }),
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
                    headers: {},
                    method: "GET",
                    url: config.datasources.PublicToilets,
                }),
                new JSONDataTypeStrategy({ resultsPath: "features" }),
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

    describe("AirQualityStations", () => {

        let datasource;

        beforeEach(() => {
            const stationsDataType = new XMLDataTypeStrategy({
                resultsPath: "AQ_hourly_index.Data.station",
                xml2jsParams: { explicitArray: false, trim: true },
            });
            stationsDataType.setFilter((item) => item.code[0].indexOf("A") === 0);
            datasource = new DataSource(AirQualityStations.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.AirQualityStations,
                }),
                stationsDataType,
                new Validator(AirQualityStations.name + "DataSource",
                    AirQualityStations.datasourceMongooseSchemaObject));
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

    describe("TSKMeteosensors", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(Meteosensors.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.TSKMeteosensors,
                }),
                new JSONDataTypeStrategy({ resultsPath: "results" }),
                new Validator(Meteosensors.name + "DataSource", Meteosensors.datasourceMongooseSchemaObject));
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

    describe("MunicipalAuthorities", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(MunicipalAuthorities.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {
                        Authorization: "Basic " + config.MOJEPRAHA_ENDPOINT_APIKEY,
                    },
                    method: "GET",
                    url: config.datasources.MunicipalAuthorities,
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                new Validator(MunicipalAuthorities.name + "DataSource",
                    MunicipalAuthorities.datasourceMongooseSchemaObject));
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.null;
        });

        describe("SkodaPalaceQueues", () => {

            let skodaPalaceQueuesDatasource;

            beforeEach(() => {
                skodaPalaceQueuesDatasource = new DataSource(MunicipalAuthorities.skodaPalaceQueues.name + "DataSource",
                    new HTTPProtocolStrategy({
                        headers: {},
                        method: "GET",
                        url: config.datasources.SkodaPalaceQueues,
                    }),
                    new XMLDataTypeStrategy({
                        resultsPath: "html.body.div",
                        xml2jsParams: { explicitArray: false, ignoreAttrs: true, trim: true },
                    }),
                    new Validator(MunicipalAuthorities.skodaPalaceQueues.name + "DataSource",
                        MunicipalAuthorities.skodaPalaceQueues.datasourceMongooseSchemaObject));
            });

            it("should returns all objects", async () => {
                const data = await skodaPalaceQueuesDatasource.getAll();
                expect(data).to.be.an.instanceOf(Object);
            });

            it("should returns last modified", async () => {
                const data = await skodaPalaceQueuesDatasource.getLastModified();
                expect(data).to.be.null;
            });

        });

    });

    describe("WasteCollectionYards", () => {

        let datasource;

        beforeEach(() => {
            const yardsDataType = new JSONDataTypeStrategy({ resultsPath: "features" });
            yardsDataType.setFilter((item) => item.properties.PLATNOST !== 0);
            datasource = new DataSource(WasteCollectionYards.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.WasteCollectionYards,
                }),
                yardsDataType,
                new Validator(WasteCollectionYards.name + "DataSource",
                    WasteCollectionYards.datasourceMongooseSchemaObject));
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

    describe("MunicipalPoliceStations", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(MunicipalPoliceStations.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.MunicipalPoliceStations,
                }),
                new JSONDataTypeStrategy({ resultsPath: "features" }),
                new Validator(MunicipalPoliceStations.name + "DataSource",
                    MunicipalPoliceStations.datasourceMongooseSchemaObject));
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

    describe("MedicalInstitutions", () => {

        let pharmaciesDatasource;
        let healthCareDatasource;

        beforeEach(() => {
            pharmaciesDatasource = new DataSource(MedicalInstitutions.pharmacies.name + "DataSource",
                new HTTPProtocolStrategy({
                    encoding: null,
                    headers: {},
                    isCompressed: true,
                    method: "GET",
                    rejectUnauthorized: false,
                    url: config.datasources.MedicalInstitutionsPharmacies,
                    whitelistedFiles: [
                        "lekarny_prac_doba.csv", "lekarny_seznam.csv", "lekarny_typ.csv",
                    ],
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                new Validator(MedicalInstitutions.pharmacies.name + "DataSource",
                    MedicalInstitutions.pharmacies.datasourceMongooseSchemaObject));
            const hcDataTypeStrategy = new CSVDataTypeStrategy({
                csvtojsonParams: { noheader: false },
                subscribe: ((json: any) => {
                    delete json.poskytovatel_ič;
                    delete json.poskytovatel_právní_forma_osoba;
                    delete json.poskytovatel_právní_forma;
                    delete json.sídlo_adresa_kód_kraje;
                    delete json.sídlo_adresa_název_kraje;
                    delete json.sídlo_adresa_kód_okresu;
                    delete json.sídlo_adresa_název_okresu;
                    delete json.sídlo_adresa_psč;
                    delete json.sídlo_adresa_název_obce;
                    delete json.sídlo_adresa_název_ulice;
                    delete json.sídlo_adresa_číslo_domovní;
                    return json;
                }),
            });
            hcDataTypeStrategy.setFilter((item) => {
                return item.adresa_kód_kraje === "CZ010"
                    && ["Fakultní nemocnice", "Nemocnice", "Nemocnice následné péče", "Ostatní ambulantní zařízení",
                        "Ostatní zdravotnická zařízení", "Ostatní zvláštní zdravotnická zařízení",
                        "Výdejna zdravotnických prostředků", "Záchytná stanice", "Zdravotní záchranná služba",
                        "Zdravotnické středisko"].indexOf(item.typ) !== -1;
            });
            healthCareDatasource = new DataSource(MedicalInstitutions.healthCare.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.MedicalInstitutionsHealthCare,
                }),
                hcDataTypeStrategy,
                new Validator(MedicalInstitutions.healthCare.name + "DataSource",
                    MedicalInstitutions.healthCare.datasourceMongooseSchemaObject));
        });

        it("should returns all pharmacies objects", async () => {
            const data = await pharmaciesDatasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns pharmacies last modified", async () => {
            const data = await pharmaciesDatasource.getLastModified();
            expect(data).to.be.not.null;
        });

        it("should returns all health care objects", async () => {
            const data = await healthCareDatasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns health care last modified", async () => {
            const data = await healthCareDatasource.getLastModified();
            expect(data).to.be.not.null;
        });

    });

    describe("SortedWasteStations", () => {

        let iprContainersDatasource;
        let iprStationsDatasource;
        let oictDatasource;
        let potexDatasource;
        let sensorsContainersDatasource;
        let sensorsMeasurementsDatasource;
        let sensorsPicksDatasource;

        beforeEach(() => {
            iprContainersDatasource = new DataSource(SortedWasteStations.ipr.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.IPRSortedWasteContainers,
                }),
                new JSONDataTypeStrategy({ resultsPath: "features" }),
                new Validator(SortedWasteStations.ipr.name + "ContainersDataSource",
                    SortedWasteStations.ipr.datasourceContainersMongooseSchemaObject));
            iprStationsDatasource = new DataSource(SortedWasteStations.ipr.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.IPRSortedWasteStations,
                }),
                new JSONDataTypeStrategy({ resultsPath: "features" }),
                new Validator(SortedWasteStations.ipr.name + "StationsDataSource",
                    SortedWasteStations.ipr.datasourceStationsMongooseSchemaObject));
            oictDatasource = new DataSource(SortedWasteStations.oict.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {
                        Authorization: "Basic " + config.MOJEPRAHA_ENDPOINT_APIKEY,
                    },
                    method: "GET",
                    url: config.datasources.OICTSortedWasteContainers,
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                new Validator(SortedWasteStations.oict.name + "DataSource",
                    SortedWasteStations.oict.datasourceMongooseSchemaObject));
            potexDatasource = new DataSource(SortedWasteStations.potex.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.POTEXSortedWasteContainers,
                }),
                new JSONDataTypeStrategy({ resultsPath: "places" }),
                new Validator(SortedWasteStations.potex.name + "DataSource",
                    SortedWasteStations.potex.datasourceMongooseSchemaObject));

            const to = new Date();
            const from = new Date();
            from.setHours(to.getHours() - 6);
            sensorsContainersDatasource = new DataSource(SortedWasteStations.sensorsContainers.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {
                        "x-api-key": config.datasources.SensoneoSortedWasteSensorsApiKey,
                    },
                    method: "GET",
                    url: config.datasources.SensoneoSortedWasteSensors + "/container",
                }),
                new JSONDataTypeStrategy({ resultsPath: "containers" }),
                new Validator(SortedWasteStations.sensorsContainers.name + "DataSource",
                    SortedWasteStations.sensorsContainers.datasourceMongooseSchemaObject));
            sensorsMeasurementsDatasource = new DataSource(SortedWasteStations.sensorsMeasurements.name + "DataSource",
                new HTTPProtocolStrategy({
                    body: JSON.stringify({ from, to }),
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": config.datasources.SensoneoSortedWasteSensorsApiKey,
                    },
                    method: "POST",
                    url: config.datasources.SensoneoSortedWasteSensors + "/measurement",
                }),
                new JSONDataTypeStrategy({ resultsPath: "measurements" }),
                new Validator(SortedWasteStations.sensorsMeasurements.name + "DataSource",
                    SortedWasteStations.sensorsMeasurements.datasourceMongooseSchemaObject));
            sensorsPicksDatasource = new DataSource(SortedWasteStations.sensorsPicks.name + "DataSource",
                new HTTPProtocolStrategy({
                    body: JSON.stringify({ from, to }),
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": config.datasources.SensoneoSortedWasteSensorsApiKey,
                    },
                    method: "POST",
                    url: config.datasources.SensoneoSortedWasteSensors + "/picks",
                }),
                new JSONDataTypeStrategy({ resultsPath: "picks" }),
                new Validator(SortedWasteStations.sensorsPicks.name + "DataSource",
                    SortedWasteStations.sensorsPicks.datasourceMongooseSchemaObject));
        });

        it("should returns all IPR Containers objects", async () => {
            const data = await iprContainersDatasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns IPR Containers last modified", async () => {
            const data = await iprContainersDatasource.getLastModified();
            expect(data).to.be.not.null;
        });

        it("should returns all IPR Stations objects", async () => {
            const data = await iprStationsDatasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns IPR Stations last modified", async () => {
            const data = await iprStationsDatasource.getLastModified();
            expect(data).to.be.not.null;
        });

        it("should returns all OICT Containers objects", async () => {
            const data = await oictDatasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns OICT Containers last modified", async () => {
            const data = await oictDatasource.getLastModified();
            expect(data).to.be.null;
        });

        it("should returns all POTEX Containers objects", async () => {
            const data = await potexDatasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns POTEX Containers last modified", async () => {
            const data = await potexDatasource.getLastModified();
            expect(data).to.be.null;
        });

        it("should returns all sensors containers objects", async () => {
            const data = await sensorsContainersDatasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns all sensors measurements objects", async () => {
            const data = await sensorsMeasurementsDatasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns all sensors picks objects", async () => {
            const data = await sensorsPicksDatasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

    });

    describe("SharedBikes", () => {

        describe("Rekola", () => {

            let datasource;

            beforeEach(() => {
                datasource = new DataSource(SharedBikes.rekola.name + "DataSource",
                    new HTTPProtocolStrategy({
                        headers: config.datasources.RekolaSharedBikesHeaders,
                        method: "GET",
                        url: config.datasources.RekolaSharedBikes,
                    }),
                    new JSONDataTypeStrategy({ resultsPath: "" }),
                    new Validator(SharedBikes.rekola.name + "DataSource",
                        SharedBikes.rekola.datasourceMongooseSchemaObject));
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

        describe("Homeport", () => {

            let locationsDatasource;
            let outOfLocationsDatasource;
            let settingsDatasource;

            beforeEach(() => {
                locationsDatasource = new DataSource(SharedBikes.homeport.name + "LocDataSource",
                    new HTTPProtocolStrategy({
                        headers: {},
                        method: "GET",
                        strictSSL: false,
                        url: config.datasources.HomeportLocationsSharedBikes,
                    }),
                    new JSONDataTypeStrategy({ resultsPath: "Locations" }),
                    new Validator(SharedBikes.homeport.name + "LocDataSource",
                        SharedBikes.homeport.datasourceLocationsMongooseSchemaObject));
                const homeportOutOfLocDataTypeStrategy = new JSONDataTypeStrategy({ resultsPath: "" });
                homeportOutOfLocDataTypeStrategy.setFilter((item) => item.AvailabilityCode === 1);
                outOfLocationsDatasource = new DataSource(SharedBikes.homeport.name + "OutOfLocDataSource",
                    new HTTPProtocolStrategy({
                        headers: {},
                        method: "GET",
                        strictSSL: false,
                        url: config.datasources.HomeportOutOfLocationsSharedBikes,
                    }),
                    homeportOutOfLocDataTypeStrategy,
                    new Validator(SharedBikes.homeport.name + "OutOfLocDataSource",
                        SharedBikes.homeport.datasourceOutOfLocationsMongooseSchemaObject));
                settingsDatasource = new DataSource(SharedBikes.homeport.name + "SetDataSource",
                    new HTTPProtocolStrategy({
                        headers: {},
                        method: "GET",
                        strictSSL: false,
                        url: config.datasources.HomeportSettingsSharedBikes,
                    }),
                    new JSONDataTypeStrategy({ resultsPath: "data.Map" }),
                    new Validator(SharedBikes.homeport.name + "SetDataSource",
                        SharedBikes.homeport.settingDatasourceMongooseSchemaObject));
            });

            it("should returns all locations objects", async () => {
                const data = await locationsDatasource.getAll();
                expect(data).to.be.an.instanceOf(Object);
            });

            it("should returns locations last modified", async () => {
                const data = await locationsDatasource.getLastModified();
                expect(data).to.be.null;
            });

            it("should returns all out of locations objects", async () => {
                const data = await outOfLocationsDatasource.getAll();
                expect(data).to.be.an.instanceOf(Object);
            });

            it("should returns out of locations last modified", async () => {
                const data = await outOfLocationsDatasource.getLastModified();
                expect(data).to.be.null;
            });

            it("should returns all settings objects", async () => {
                const data = await settingsDatasource.getAll();
                expect(data).to.be.an.instanceOf(Object);
            });

            it("should returns settings last modified", async () => {
                const data = await settingsDatasource.getLastModified();
                expect(data).to.be.null;
            });

        });

    });

    describe("BicycleParkings", () => {

        let datasource;

        beforeEach(() => {
            datasource = new DataSource(BicycleParkings.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.BicycleParkings,
                }),
                new JSONDataTypeStrategy({ resultsPath: "elements" }),
                new Validator(BicycleParkings.name + "DataSource",
                    BicycleParkings.datasourceMongooseSchemaObject));
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

});
