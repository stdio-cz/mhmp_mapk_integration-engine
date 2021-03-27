/// <reference path="./DataSourcesAvailabilityChecking.test.d.ts" />
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import JSONStream from "JSONStream";
import { sign } from "jsonwebtoken";
import { File } from "@google-cloud/storage";
import { promisify } from "util";
import { JSONSchemaValidator, ObjectKeysValidator, Validator } from "@golemio/core/dist/shared/golemio-validator";
import moment from "@golemio/core/dist/shared/moment-timezone";
import { config } from "@golemio/core/dist/integration-engine/config";
import { RedisConnector } from "@golemio/core/dist/integration-engine/connectors";
import {
    CSVDataTypeStrategy,
    DataSource,
    DataSourceStreamed,
    FTPProtocolStrategy,
    GoogleCloudStorageProtocolStrategy,
    HTTPProtocolStrategy,
    HTTPProtocolStrategyStreamed,
    IHTTPSettings,
    JSONDataTypeStrategy,
    XMLDataTypeStrategy,
} from "@golemio/core/dist/integration-engine/datasources";

// Schema definitions
import { AirQualityStations } from "@golemio/air-quality-stations/dist/schema-definitions";
import { BicycleCounters } from "@golemio/bicycle-counters/dist/schema-definitions";
import { BicycleParkings } from "@golemio/bicycle-parkings/dist/schema-definitions";
import { CityDistricts } from "@golemio/city-districts/dist/schema-definitions";
import { EnergeticsSchema as Energetics, EnergeticsTypes } from "@golemio/energetics/dist/schema-definitions";
import { Gardens } from "@golemio/gardens/dist/schema-definitions";
import { MedicalInstitutions } from "@golemio/medical-institutions/dist/schema-definitions";
import { Meteosensors } from "@golemio/meteosensors/dist/schema-definitions";
import { MobileAppStatistics } from "@golemio/mobile-app-statistics/dist/schema-definitions";
import { MunicipalAuthorities } from "@golemio/municipal-authorities/dist/schema-definitions";
import { MunicipalLibraries } from "@golemio/municipal-libraries/dist/schema-definitions";
import { MunicipalPoliceStations } from "@golemio/municipal-police-stations/dist/schema-definitions";
import { Parkings } from "@golemio/parkings/dist/schema-definitions";
import { ParkingZones } from "@golemio/parking-zones/dist/schema-definitions";
import { Parkomats } from "@golemio/parkomats/dist/schema-definitions";
import { Playgrounds } from "@golemio/playgrounds/dist/schema-definitions";
import { PublicToilets } from "@golemio/public-toilets/dist/schema-definitions";
import { RopidGTFS } from "@golemio/ropid-gtfs/dist/schema-definitions";
import { SharedBikes } from "@golemio/shared-bikes/dist/schema-definitions";
import { SharedCars } from "@golemio/shared-cars/dist/schema-definitions";
import { SortedWasteStations } from "@golemio/sorted-waste-stations/dist/schema-definitions";
import { TrafficCameras } from "@golemio/traffic-cameras/dist/schema-definitions";
import { WasteCollectionYards } from "@golemio/waste-collection-yards/dist/schema-definitions";
import { WazeCCP } from "@golemio/waze-ccp/dist/schema-definitions";
import { WazeTT } from "@golemio/waze-tt/dist/schema-definitions";

import { EnesaApi, UnimonitorCemApi } from "@golemio/energetics/dist/integration-engine/helpers";

import EnesaBuildings = EnergeticsTypes.Enesa.Buildings;
import EnesaConsumption = EnergeticsTypes.Enesa.Consumption;
import EnesaDevices = EnergeticsTypes.Enesa.Devices;

chai.use(chaiAsPromised);

const sleep = promisify(setTimeout);

describe("DataSourcesAvailabilityChecking", () => {
    before(async () => {
        await RedisConnector.connect();
    });

    describe("CityDistricts", () => {
        let datasource: DataSource;

        beforeEach(() => {
            datasource = new DataSource(
                CityDistricts.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.CityDistricts,
                }),
                new JSONDataTypeStrategy({ resultsPath: "features" }),
                new Validator(CityDistricts.name + "DataSource", CityDistricts.datasourceMongooseSchemaObject)
            );
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.a("string");
        });
    });

    describe("ParkingZones", () => {
        let datasource: DataSource;
        let datasourceTariffs: DataSource;

        beforeEach(() => {
            const zonesProtocol = new JSONDataTypeStrategy({ resultsPath: "features" });
            zonesProtocol.setFilter((item) => item.properties.TARIFTAB);
            datasource = new DataSource(
                ParkingZones.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.ParkingZones,
                }),
                zonesProtocol,
                new Validator(ParkingZones.name + "DataSource", ParkingZones.datasourceMongooseSchemaObject)
            );
            datasourceTariffs = new DataSource(
                "ParkingZonesTariffsDataSource",
                new HTTPProtocolStrategy({
                    headers: {
                        authorization: config.datasources.ParkingZonesTariffsAuth,
                    },
                    json: true,
                    method: "GET",
                    url: config.datasources.ParkingZonesTariffs + "P1-0133",
                }),
                new JSONDataTypeStrategy({ resultsPath: "dailyTariff" }),
                new Validator("ParkingZonesTariffsDataSource", ParkingZones.datasourceTariffsMongooseSchemaObject)
            );
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.a("string");
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
        let datasource: DataSource;
        let datasourceCisStops: DataSource;

        beforeEach(() => {
            datasource = new DataSource(
                RopidGTFS.name + "DataSource",
                new FTPProtocolStrategy({
                    filename: config.datasources.RopidGTFSFilename,
                    isCompressed: true,
                    path: config.datasources.RopidGTFSPath,
                    tmpDir: "/tmp/",
                    url: config.datasources.RopidFTP,
                    whitelistedFiles: [
                        "agency.txt",
                        "calendar.txt",
                        "calendar_dates.txt",
                        "shapes.txt",
                        "stop_times.txt",
                        "stops.txt",
                        "routes.txt",
                        "trips.txt",
                    ],
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                null as any
            );
            datasourceCisStops = new DataSource(
                RopidGTFS.name + "CisStops",
                new FTPProtocolStrategy({
                    filename: config.datasources.RopidGTFSCisStopsFilename,
                    path: config.datasources.RopidGTFSCisStopsPath,
                    tmpDir: "/tmp/",
                    url: config.datasources.RopidFTP,
                }),
                new JSONDataTypeStrategy({ resultsPath: "stopGroups" }),
                null as any
            );
        });

        it("should returns all objects", async () => {
            const data = await datasource.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns last modified", async () => {
            const data = await datasource.getLastModified();
            expect(data).to.be.a("string");
        });

        it("should returns all cis objects", async () => {
            const data = await datasourceCisStops.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should returns cis last modified", async () => {
            const data = await datasourceCisStops.getLastModified();
            expect(data).to.be.a("string");
        });
    });

    describe("TSKParkings", () => {
        let datasource: DataSource;

        beforeEach(() => {
            datasource = new DataSource(
                Parkings.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.TSKParkings,
                }),
                new JSONDataTypeStrategy({ resultsPath: "results" }),
                new Validator(Parkings.name + "DataSource", Parkings.datasourceMongooseSchemaObject)
            );
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
        let datasource: DataSource;

        beforeEach(() => {
            datasource = new DataSource(
                TrafficCameras.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.TSKTrafficCameras,
                }),
                new JSONDataTypeStrategy({ resultsPath: "results" }),
                new Validator(TrafficCameras.name + "DataSource", TrafficCameras.datasourceMongooseSchemaObject)
            );
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
            let datasource: DataSource;

            beforeEach(() => {
                datasource = new DataSource(
                    SharedCars.ceskyCarsharing.name + "DataSource",
                    new HTTPProtocolStrategy({
                        body: JSON.stringify(config.datasources.CeskyCarsharingSharedCarsEndpointCredentials),
                        headers: {
                            "Content-Type": "application/json",
                        },
                        method: "POST",
                        url: config.datasources.CeskyCarsharingSharedCars,
                    }),
                    new JSONDataTypeStrategy({ resultsPath: "cars" }),
                    new Validator(
                        SharedCars.ceskyCarsharing.name + "DataSource",
                        SharedCars.ceskyCarsharing.datasourceMongooseSchemaObject
                    )
                );
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
            let datasource: DataSource;

            beforeEach(() => {
                const hoppyGoDataType = new JSONDataTypeStrategy({ resultsPath: "" });
                hoppyGoDataType.setFilter((item) => item.localization && item.localization !== "" && item.localization !== ",");
                datasource = new DataSource(
                    SharedCars.hoppyGo.name + "DataSource",
                    new HTTPProtocolStrategy({
                        headers: {
                            "x-app-token": config.datasources.HoppyGoSharedCarsToken,
                        },
                        method: "GET",
                        url: config.datasources.HoppyGoSharedCars,
                    }),
                    hoppyGoDataType,
                    new Validator(SharedCars.hoppyGo.name + "DataSource", SharedCars.hoppyGo.datasourceMongooseSchemaObject)
                );
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
        let datasource: DataSource;

        beforeEach(() => {
            datasource = new DataSource(
                Gardens.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {
                        Authorization: "Basic " + config.datasources.OICTEndpointApikey,
                    },
                    method: "GET",
                    url: config.datasources.Gardens,
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                new Validator(Gardens.name + "DataSource", Gardens.datasourceMongooseSchemaObject)
            );
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
        let datasource: DataSource;

        beforeEach(() => {
            datasource = new DataSource(
                Playgrounds.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.Playgrounds,
                }),
                new JSONDataTypeStrategy({ resultsPath: "items" }),
                new Validator(Playgrounds.name + "DataSource", Playgrounds.datasourceMongooseSchemaObject)
            );
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
        let datasource: DataSource;

        beforeEach(() => {
            datasource = new DataSource(
                PublicToilets.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.PublicToilets,
                }),
                new JSONDataTypeStrategy({ resultsPath: "features" }),
                new Validator(PublicToilets.name + "DataSource", PublicToilets.datasourceMongooseSchemaObject)
            );
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
        describe("Actual hour data", () => {
            let datasource: DataSource;

            beforeEach(() => {
                datasource = new DataSource(
                    AirQualityStations.name + "1HDataSource",
                    new HTTPProtocolStrategy({
                        headers: {},
                        method: "GET",
                        url: config.datasources.AirQualityStations1H,
                    }),
                    new JSONDataTypeStrategy({ resultsPath: "" }),
                    new JSONSchemaValidator(AirQualityStations.name + "1HDataSource", AirQualityStations.datasourceJsonSchema)
                );
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

        describe("AQIndex 3 hours data", () => {
            let datasource: DataSource;

            beforeEach(() => {
                datasource = new DataSource(
                    AirQualityStations.name + "3HDataSource",
                    new HTTPProtocolStrategy({
                        headers: {},
                        method: "GET",
                        url: config.datasources.AirQualityStations3H,
                    }),
                    new JSONDataTypeStrategy({ resultsPath: "" }),
                    new JSONSchemaValidator(AirQualityStations.name + "3HDataSource", AirQualityStations.datasourceJsonSchema)
                );
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

    describe("TSKMeteosensors", () => {
        let datasource: DataSource;

        beforeEach(() => {
            datasource = new DataSource(
                Meteosensors.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.TSKMeteosensors,
                }),
                new JSONDataTypeStrategy({ resultsPath: "results" }),
                new Validator(Meteosensors.name + "DataSource", Meteosensors.datasourceMongooseSchemaObject)
            );
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
        let datasource: DataSource;

        beforeEach(() => {
            datasource = new DataSource(
                MunicipalAuthorities.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {
                        Authorization: "Basic " + config.datasources.OICTEndpointApikey,
                    },
                    method: "GET",
                    url: config.datasources.MunicipalAuthorities,
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                new Validator(MunicipalAuthorities.name + "DataSource", MunicipalAuthorities.datasourceMongooseSchemaObject)
            );
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
            let skodaPalaceQueuesDatasource: DataSource;

            beforeEach(() => {
                skodaPalaceQueuesDatasource = new DataSource(
                    MunicipalAuthorities.skodaPalaceQueues.name + "DataSource",
                    new HTTPProtocolStrategy({
                        headers: {},
                        method: "GET",
                        url: config.datasources.SkodaPalaceQueues,
                    }),
                    new XMLDataTypeStrategy({
                        resultsPath: "html.body.div",
                        xml2jsParams: { explicitArray: false, ignoreAttrs: true, trim: true },
                    }),
                    new Validator(
                        MunicipalAuthorities.skodaPalaceQueues.name + "DataSource",
                        MunicipalAuthorities.skodaPalaceQueues.datasourceMongooseSchemaObject
                    )
                );
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
        let datasource: DataSource;

        beforeEach(() => {
            const yardsDataType = new JSONDataTypeStrategy({ resultsPath: "features" });
            yardsDataType.setFilter((item) => item.properties.PLATNOST !== 0);
            datasource = new DataSource(
                WasteCollectionYards.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.WasteCollectionYards,
                }),
                yardsDataType,
                new Validator(WasteCollectionYards.name + "DataSource", WasteCollectionYards.datasourceMongooseSchemaObject)
            );
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
        let datasource: DataSource;

        beforeEach(() => {
            datasource = new DataSource(
                MunicipalPoliceStations.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.MunicipalPoliceStations,
                }),
                new JSONDataTypeStrategy({ resultsPath: "features" }),
                new Validator(MunicipalPoliceStations.name + "DataSource", MunicipalPoliceStations.datasourceMongooseSchemaObject)
            );
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
        let pharmaciesDatasource: DataSource;
        let healthCareDatasource: DataSource;

        beforeEach(() => {
            pharmaciesDatasource = new DataSource(
                MedicalInstitutions.pharmacies.name + "DataSource",
                new HTTPProtocolStrategy({
                    encoding: null,
                    headers: {},
                    isCompressed: true,
                    method: "GET",
                    rejectUnauthorized: false,
                    url: config.datasources.MedicalInstitutionsPharmacies,
                    whitelistedFiles: ["lekarny_prac_doba.csv", "lekarny_seznam.csv", "lekarny_typ.csv"],
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                new Validator(
                    MedicalInstitutions.pharmacies.name + "DataSource",
                    MedicalInstitutions.pharmacies.datasourceMongooseSchemaObject
                )
            );
            const hcDataTypeStrategy = new CSVDataTypeStrategy({
                fastcsvParams: { headers: true },
                subscribe: (json: any) => {
                    delete json.CisloDomovniOrientacniSidlo;
                    delete json.DruhPece;
                    delete json.FormaPece;
                    delete json.Ico;
                    delete json.Kod;
                    delete json.Kraj;
                    delete json.KrajCodeSidlo;
                    delete json.MistoPoskytovaniId;
                    delete json.ObecSidlo;
                    delete json.OborPece;
                    delete json.OdbornyZastupce;
                    delete json.Okres;
                    delete json.OkresCode;
                    delete json.OkresCodeSidlo;
                    delete json.PoskytovatelFax;
                    delete json.PravniFormaKod;
                    delete json.PscSidlo;
                    delete json.SpravniObvod;
                    delete json.TypOsoby;
                    delete json.UliceSidlo;
                    return json;
                },
            });
            hcDataTypeStrategy.setFilter((item) => {
                return (
                    item.KrajCode === "CZ010" &&
                    item.Lat &&
                    item.Lng &&
                    [
                        "Fakultní nemocnice",
                        "Nemocnice",
                        "Nemocnice následné péče",
                        "Ostatní ambulantní zařízení",
                        "Ostatní zdravotnická zařízení",
                        "Ostatní zvláštní zdravotnická zařízení",
                        "Výdejna zdravotnických prostředků",
                        "Záchytná stanice",
                        "Zdravotní záchranná služba",
                        "Zdravotnické středisko",
                    ].indexOf(item.DruhZarizeni) !== -1
                );
            });
            healthCareDatasource = new DataSource(
                MedicalInstitutions.healthCare.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.MedicalInstitutionsHealthCare,
                }),
                hcDataTypeStrategy,
                new Validator(
                    MedicalInstitutions.healthCare.name + "DataSource",
                    MedicalInstitutions.healthCare.datasourceMongooseSchemaObject
                )
            );
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
        let iprContainersDatasource: DataSource;
        let iprStationsDatasource: DataSource;
        let oictDatasource: DataSource;
        let potexDatasource: DataSource;
        let sensorsContainersDatasource: DataSource;
        let sensorsMeasurementsDatasource: DataSource;
        let sensorsPicksDatasource: DataSource;

        beforeEach(() => {
            iprContainersDatasource = new DataSource(
                SortedWasteStations.ipr.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.IPRSortedWasteContainers,
                }),
                new JSONDataTypeStrategy({ resultsPath: "features" }),
                new Validator(
                    SortedWasteStations.ipr.name + "ContainersDataSource",
                    SortedWasteStations.ipr.datasourceContainersMongooseSchemaObject
                )
            );
            iprStationsDatasource = new DataSource(
                SortedWasteStations.ipr.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.IPRSortedWasteStations,
                }),
                new JSONDataTypeStrategy({ resultsPath: "features" }),
                new Validator(
                    SortedWasteStations.ipr.name + "StationsDataSource",
                    SortedWasteStations.ipr.datasourceStationsMongooseSchemaObject
                )
            );
            oictDatasource = new DataSource(
                SortedWasteStations.oict.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {
                        Authorization: "Basic " + config.datasources.OICTEndpointApikey,
                    },
                    method: "GET",
                    url: config.datasources.OICTSortedWasteContainers,
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                new Validator(
                    SortedWasteStations.oict.name + "DataSource",
                    SortedWasteStations.oict.datasourceMongooseSchemaObject
                )
            );
            potexDatasource = new DataSource(
                SortedWasteStations.potex.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.POTEXSortedWasteContainers,
                }),
                new JSONDataTypeStrategy({ resultsPath: "places" }),
                new Validator(
                    SortedWasteStations.potex.name + "DataSource",
                    SortedWasteStations.potex.datasourceMongooseSchemaObject
                )
            );

            const to = new Date();
            const from = new Date();
            from.setHours(to.getHours() - 6);
            sensorsContainersDatasource = new DataSource(
                SortedWasteStations.sensorsContainers.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {
                        "x-api-key": config.datasources.SensoneoSortedWasteSensorsApiKey,
                    },
                    method: "GET",
                    url: config.datasources.SensoneoSortedWasteSensors + "/container",
                }),
                new JSONDataTypeStrategy({ resultsPath: "containers" }),
                new Validator(
                    SortedWasteStations.sensorsContainers.name + "DataSource",
                    SortedWasteStations.sensorsContainers.datasourceMongooseSchemaObject
                )
            );
            sensorsMeasurementsDatasource = new DataSource(
                SortedWasteStations.sensorsMeasurements.name + "DataSource",
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
                new Validator(
                    SortedWasteStations.sensorsMeasurements.name + "DataSource",
                    SortedWasteStations.sensorsMeasurements.datasourceMongooseSchemaObject
                )
            );
            sensorsPicksDatasource = new DataSource(
                SortedWasteStations.sensorsPicks.name + "DataSource",
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
                new Validator(
                    SortedWasteStations.sensorsPicks.name + "DataSource",
                    SortedWasteStations.sensorsPicks.datasourceMongooseSchemaObject
                )
            );
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
            let datasource: DataSource;

            beforeEach(() => {
                datasource = new DataSource(
                    SharedBikes.rekola.name + "DataSource",
                    new HTTPProtocolStrategy({
                        headers: config.datasources.RekolaSharedBikesHeaders,
                        method: "GET",
                        url: config.datasources.RekolaSharedBikes,
                    }),
                    new JSONDataTypeStrategy({ resultsPath: "" }),
                    new Validator(SharedBikes.rekola.name + "DataSource", SharedBikes.rekola.datasourceMongooseSchemaObject)
                );
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
            let locationsDatasource: DataSource;
            let outOfLocationsDatasource: DataSource;
            let settingsDatasource: DataSource;

            beforeEach(() => {
                locationsDatasource = new DataSource(
                    SharedBikes.homeport.name + "LocDataSource",
                    new HTTPProtocolStrategy({
                        headers: {},
                        method: "GET",
                        strictSSL: false,
                        url: config.datasources.HomeportLocationsSharedBikes,
                    }),
                    new JSONDataTypeStrategy({ resultsPath: "Locations" }),
                    new Validator(
                        SharedBikes.homeport.name + "LocDataSource",
                        SharedBikes.homeport.datasourceLocationsMongooseSchemaObject
                    )
                );
                const homeportOutOfLocDataTypeStrategy = new JSONDataTypeStrategy({ resultsPath: "" });
                homeportOutOfLocDataTypeStrategy.setFilter((item) => item.AvailabilityCode === 1);
                outOfLocationsDatasource = new DataSource(
                    SharedBikes.homeport.name + "OutOfLocDataSource",
                    new HTTPProtocolStrategy({
                        headers: {},
                        method: "GET",
                        strictSSL: false,
                        url: config.datasources.HomeportOutOfLocationsSharedBikes,
                    }),
                    homeportOutOfLocDataTypeStrategy,
                    new Validator(
                        SharedBikes.homeport.name + "OutOfLocDataSource",
                        SharedBikes.homeport.datasourceOutOfLocationsMongooseSchemaObject
                    )
                );
                settingsDatasource = new DataSource(
                    SharedBikes.homeport.name + "SetDataSource",
                    new HTTPProtocolStrategy({
                        headers: {},
                        method: "GET",
                        strictSSL: false,
                        url: config.datasources.HomeportSettingsSharedBikes,
                    }),
                    new JSONDataTypeStrategy({ resultsPath: "data.Map" }),
                    new Validator(
                        SharedBikes.homeport.name + "SetDataSource",
                        SharedBikes.homeport.settingDatasourceMongooseSchemaObject
                    )
                );
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
        let datasource: DataSource;

        beforeEach(() => {
            datasource = new DataSource(
                BicycleParkings.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.BicycleParkings,
                }),
                new JSONDataTypeStrategy({ resultsPath: "elements" }),
                new Validator(BicycleParkings.name + "DataSource", BicycleParkings.datasourceMongooseSchemaObject)
            );
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

    describe("TSKParkomats", () => {
        let datasource: DataSource;

        beforeEach(() => {
            const to = moment.tz(new Date(), "Europe/Prague");
            const from = to.clone();
            from.subtract(12, "minutes");
            const url =
                config.datasources.TSKParkomats +
                `/parkingsessions?from=${from.format("YYYY-MM-DDTHH:mm:ss")}&to=${to.format("YYYY-MM-DDTHH:mm:ss")}`;

            const dataSourceHTTPSettings: IHTTPSettings = {
                headers: {
                    authorization: config.datasources.TSKParkomatsToken,
                },
                method: "GET",
                url,
            };

            datasource = new DataSource(
                Parkomats.name + "DataSource",
                new HTTPProtocolStrategy(dataSourceHTTPSettings),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                new ObjectKeysValidator(Parkomats.name + "DataSource", Parkomats.datasourceMongooseSchemaObject)
            );
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

    describe("BicycleCounters", () => {
        describe("Camea", () => {
            let datasource: DataSource;

            beforeEach(() => {
                const url = config.datasources.BicycleCountersCamea;

                const dataSourceHTTPSettings: IHTTPSettings = {
                    headers: {},
                    method: "GET",
                    url,
                };

                datasource = new DataSource(
                    BicycleCounters.camea.name + "DataSource",
                    new HTTPProtocolStrategy(dataSourceHTTPSettings),
                    new JSONDataTypeStrategy({ resultsPath: "" }),
                    new Validator(BicycleCounters.camea.name + "DataSource", BicycleCounters.camea.datasourceMongooseSchemaObject)
                );
            });

            it("should returns all objects", async () => {
                const data = await datasource.getAll();
                expect(data).to.be.an.instanceOf(Object);
            });

            it("should returns last modified", async () => {
                const data = await datasource.getLastModified();
                expect(data).to.be.null;
            });

            describe("measurements", () => {
                let measurementsDatasource: DataSource;

                beforeEach(() => {
                    const now = moment.utc();
                    const step = 5;
                    const remainder = step - (now.minute() % step);
                    // rounded to nearest next 5 minutes
                    const nowRounded = now.clone().add(remainder, "minutes").seconds(0).milliseconds(0);
                    const nowMinus12h = nowRounded.clone().subtract(12, "hours");
                    const strNow = nowRounded.format("YYYY-MM-DD HH:mm:ss");
                    const strNowMinus12h = nowMinus12h.format("YYYY-MM-DD HH:mm:ss");

                    let url = config.datasources.BicycleCountersCameaMeasurements;
                    url = url.replace(":id", "BC_AT-STLA");
                    url = url.replace(":from", strNowMinus12h);
                    url = url.replace(":to", strNow);

                    measurementsDatasource = new DataSource(
                        BicycleCounters.camea.name + "MeasurementsDataSource",
                        new HTTPProtocolStrategy({
                            headers: {},
                            json: true,
                            method: "GET",
                            url,
                        }),
                        new JSONDataTypeStrategy({ resultsPath: "" }),
                        new Validator(
                            BicycleCounters.camea.name + "MeasurementsDataSource",
                            BicycleCounters.camea.measurementsDatasourceMongooseSchemaObject
                        )
                    );
                });

                it("should returns all measurements objects", async () => {
                    const data = await measurementsDatasource.getAll();
                    expect(data).to.be.an.instanceOf(Object);
                });

                it("should returns measurements last modified", async () => {
                    const data = await measurementsDatasource.getLastModified();
                    expect(data).to.be.null;
                });
            });
        });

        describe("EcoCounter", () => {
            let datasource: DataSource;

            beforeEach(() => {
                const url = config.datasources.BicycleCountersEcoCounter;

                const dataSourceHTTPSettings: IHTTPSettings = {
                    headers: {
                        Authorization: `Bearer ${config.datasources.CountersEcoCounterTokens.PRAHA}`,
                    },
                    method: "GET",
                    url,
                };

                datasource = new DataSource(
                    BicycleCounters.ecoCounter.name + "DataSource",
                    new HTTPProtocolStrategy(dataSourceHTTPSettings),
                    new JSONDataTypeStrategy({ resultsPath: "" }),
                    new Validator(
                        BicycleCounters.ecoCounter.name + "DataSource",
                        BicycleCounters.ecoCounter.datasourceMongooseSchemaObject
                    )
                );
            });

            it("should returns all objects", async () => {
                const data = await datasource.getAll();
                expect(data).to.be.an.instanceOf(Object);
            });

            it("should returns last modified", async () => {
                const data = await datasource.getLastModified();
                expect(data).to.be.null;
            });

            describe("measurements", () => {
                let measurementsDatasource: DataSource;

                beforeEach(() => {
                    // EcoCounter API is actually working with local Europe/Prague time, not ISO!!!
                    // so we have to send local time to request.
                    // Furthermore, the returned dates are START of the measurement interval, so if we want measurements
                    // from interval between 06:00 and 07:00 UTC (which is local 07:00 - 08:00),
                    // we have to send parameters
                    // from=07:00 and to=07:45, because it returns all the measurements where
                    // from and to parameters are INCLUDED.
                    const now = moment.utc().tz("Europe/Prague");
                    const step = 15;
                    const remainder = now.minute() % step;
                    // rounded to nearest next 15 minutes
                    const nowRounded = now.clone().subtract(remainder, "minutes").seconds(0).milliseconds(0);
                    const strTo = nowRounded.clone().subtract(step, "minutes").format("YYYY-MM-DDTHH:mm:ss");
                    const strFrom = nowRounded.clone().subtract(12, "hours").format("YYYY-MM-DDTHH:mm:ss");

                    let url = config.datasources.BicycleCountersEcoCounterMeasurements;
                    url = url.replace(":id", "103047647"); // 100047647
                    url = url.replace(":from", strFrom);
                    url = url.replace(":to", strTo);
                    url = url.replace(":step", `${step}m`);
                    url = url.replace(":complete", "true");

                    measurementsDatasource = new DataSource(
                        BicycleCounters.ecoCounter.name + "MeasurementsDataSource",
                        new HTTPProtocolStrategy({
                            headers: {
                                Authorization: `Bearer ${config.datasources.CountersEcoCounterTokens.PRAHA}`,
                            },
                            json: true,
                            method: "GET",
                            url,
                        }),
                        new JSONDataTypeStrategy({ resultsPath: "" }),
                        new Validator(
                            BicycleCounters.ecoCounter.name + "MeasurementsDataSource",
                            BicycleCounters.ecoCounter.measurementsDatasourceMongooseSchemaObject
                        )
                    );
                });

                it("should returns all measurements objects", async () => {
                    const data = await measurementsDatasource.getAll();
                    expect(data).to.be.an.instanceOf(Object);
                });

                it("should returns measurements last modified", async () => {
                    const data = await measurementsDatasource.getLastModified();
                    expect(data).to.be.null;
                });
            });
        });
    });

    describe("WazeCCP", () => {
        let dataSourceAlerts: DataSource;
        let dataSourceIrregularities: DataSource;
        let dataSourceJams: DataSource;

        beforeEach(() => {
            const to = moment.tz(new Date(), "Europe/Prague");
            const from = to.clone();
            from.subtract(12, "minutes");
            const url = config.datasources.WazeCCP;

            dataSourceAlerts = new DataSource(
                WazeCCP.alerts.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: url + "&types=alerts",
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                new JSONSchemaValidator(WazeCCP.alerts.name + "DataSource", WazeCCP.alerts.datasourceJsonSchema)
            );
            dataSourceIrregularities = new DataSource(
                WazeCCP.irregularities.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: url + "&types=irregularities",
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                new JSONSchemaValidator(WazeCCP.irregularities.name + "DataSource", WazeCCP.irregularities.datasourceJsonSchema)
            );
            dataSourceJams = new DataSource(
                WazeCCP.jams.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: url + "&types=traffic",
                }),
                new JSONDataTypeStrategy({ resultsPath: "" }),
                new JSONSchemaValidator(WazeCCP.jams.name + "DataSource", WazeCCP.jams.datasourceJsonSchema)
            );
        });

        it("should return all objects in Alerts", async () => {
            const data = await dataSourceAlerts.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should return last modified in Alerts", async () => {
            const data = await dataSourceAlerts.getLastModified();
            expect(data).to.be.not.null;
        });

        it("should return all objects in Irregularities", async () => {
            const data = await dataSourceIrregularities.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should return last modified in Irregularities", async () => {
            const data = await dataSourceIrregularities.getLastModified();
            expect(data).to.be.not.null;
        });

        it("should return all objects in Traffic Jams", async () => {
            const data = await dataSourceJams.getAll();
            expect(data).to.be.an.instanceOf(Object);
        });

        it("should return last modified in Traffic Jams", async () => {
            const data = await dataSourceJams.getLastModified();
            expect(data).to.be.not.null;
        });
    });

    describe("MobileAppStatistics", () => {
        describe("AppStore", () => {
            let appStoreDataSource: DataSource;
            let bearerToken: string;
            const date = moment.tz(new Date(), "Europe/Prague");
            date.subtract(2, "day");

            bearerToken = sign(
                {
                    aud: "appstoreconnect-v1",
                    exp: Math.floor(Date.now() / 1000) + 20 * 60,
                    iss: config.datasources.AppStoreConnectCredentials.iss,
                },
                config.datasources.AppStoreConnectCredentials.private_key,
                {
                    header: {
                        alg: "ES256",
                        kid: config.datasources.AppStoreConnectCredentials.kid,
                        typ: "JWT",
                    },
                }
            );

            beforeEach(() => {
                appStoreDataSource = new DataSource(
                    "AppStoreConnectDataSource",
                    new HTTPProtocolStrategy({
                        encoding: null,
                        headers: {
                            Accept: "application/a-gzip",
                            Authorization: `Bearer ${bearerToken}`,
                        },
                        isGunZipped: true,
                        method: "GET",
                        url: config.datasources.AppStoreConnect.replace(":reportDate", date.format("YYYY-MM-DD")),
                    }),
                    new CSVDataTypeStrategy({
                        fastcsvParams: { headers: true, delimiter: "\t" },
                        subscribe: (json: any) => json,
                    }),
                    new Validator(MobileAppStatistics.appStore.name, MobileAppStatistics.appStore.datasourceMongooseSchemaObject)
                );
            });

            it("should returns data from AppStore", async () => {
                const data = await appStoreDataSource.getAll();
                expect(data).to.be.an.instanceOf(Object);
            });

            it("should return last modified in AppStore", async () => {
                const data = await appStoreDataSource.getLastModified();
                expect(data).to.be.null;
            });
        });

        describe("PlayStore", async () => {
            let playStoreDataSource: DataSource;

            beforeEach(() => {
                playStoreDataSource = new DataSource(
                    MobileAppStatistics.playStore.name + "DataSource",
                    new GoogleCloudStorageProtocolStrategy({
                        bucketName: "pubsite_prod_rev_01447282685199189351",
                        filesFilter: (f: File) => f.name.indexOf("_overview.csv") !== -1,
                        filesPrefix: "stats/installs",
                        keyFilename: config.datasources.PlayStoreKeyFilename,
                    }),
                    new JSONDataTypeStrategy({ resultsPath: "" }),
                    new Validator(
                        MobileAppStatistics.playStore.name + "DataSource",
                        MobileAppStatistics.playStore.datasourceMongooseSchemaObject
                    )
                );
            });

            it("should returns data from PlayStore", async () => {
                const data = await playStoreDataSource.getAll();
                expect(data).to.be.an.instanceOf(Object);
            });
        });
    });

    describe("MunicipalLibraries", () => {
        let datasource: DataSource;

        beforeEach(() => {
            datasource = new DataSource(
                MunicipalLibraries.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers: {},
                    method: "GET",
                    url: config.datasources.MunicipalLibraries,
                }),
                new XMLDataTypeStrategy({
                    resultsPath: "pobocky.pobocka",
                    xml2jsParams: { explicitArray: false, ignoreAttrs: true, trim: true },
                }),
                new JSONSchemaValidator(MunicipalLibraries.name + "DataSource", MunicipalLibraries.datasourceJsonSchema)
            );
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

    describe("Energetics", () => {
        describe("Enesa", () => {
            let dateParams = {
                from: "",
                to: "",
            };

            const testEnesaDataset = async (
                resourceType: string,
                schemaConfig: Record<string, any>,
                jsonTransformer: any,
                onDataFunction: (data: any) => Promise<void>
            ) => {
                const baseUrl = config.datasources.EnesaApiEnergeticsUrl;
                const params = new URLSearchParams(dateParams);
                const datasource = new DataSourceStreamed(
                    schemaConfig.name + "DataSource",
                    new HTTPProtocolStrategyStreamed({
                        headers: config.datasources.EnesaApiEnergeticsHeaders,
                        method: "GET",
                        url: `${baseUrl}/${resourceType}?${params}`,
                    }).setStreamTransformer(jsonTransformer),
                    new JSONDataTypeStrategy({ resultsPath: "" }),
                    new JSONSchemaValidator(schemaConfig.name + "DataSource", schemaConfig.datasourceJsonSchema)
                );

                const dataStream = await datasource.getAll(false);
                await Promise.race([dataStream.setDataProcessor(onDataFunction).proceed(), sleep(1000)]);

                if (!dataStream.destroyed) {
                    dataStream.destroy();
                }
            };

            before(() => {
                const now = moment().tz(EnesaApi.API_DATE_TZ);
                const dateFrom = now.clone().subtract(1, "day").format(EnesaApi.API_DATE_FORMAT);
                const dateTo = now.format(EnesaApi.API_DATE_FORMAT);

                dateParams = {
                    from: dateFrom,
                    to: dateTo,
                };
            });

            it("Energy Buildings Dataset should return all items", async () => {
                await testEnesaDataset(
                    EnesaApi.resourceType.Buildings,
                    Energetics.enesa.buildings,
                    JSONStream.parse("buildings.*"),
                    async (data: EnesaBuildings.InputElement) => {
                        expect(Object.keys(data).length).to.be.greaterThan(0);
                    }
                );
            });

            it("Energy Consumption Dataset should return all items", async () => {
                await testEnesaDataset(
                    EnesaApi.resourceType.Consumption,
                    Energetics.enesa.consumption,
                    JSONStream.parse("*"),
                    async (data: EnesaConsumption.InputElement) => {
                        expect(Object.keys(data).length).to.be.greaterThan(0);
                    }
                );
            });

            it("Energy Consumption Visapp Dataset should return all items", async () => {
                await testEnesaDataset(
                    EnesaApi.resourceType.ConsumptionVisapp,
                    Energetics.enesa.consumption,
                    JSONStream.parse("*"),
                    async (data: EnesaConsumption.InputElement) => {
                        expect(Object.keys(data).length).to.be.greaterThan(0);
                    }
                );
            });

            it("Energy Devices Dataset should return all items", async () => {
                await testEnesaDataset(
                    EnesaApi.resourceType.Devices,
                    Energetics.enesa.devices,
                    JSONStream.parse("devices.*"),
                    async (data: EnesaDevices.InputElement) => {
                        expect(Object.keys(data).length).to.be.greaterThan(0);
                    }
                );
            });
        });

        describe("Vpalac", () => {
            let authCookie = "";
            let dateParams = {
                from: "",
                to: "",
            };

            const testVpalacDataset = async (
                resourceType: string,
                schemaConfig: Record<string, any>,
                additionalParams: Record<string, string>,
                onDataFunction: (data: any) => Promise<void>
            ) => {
                const baseUrl = config.datasources.UnimonitorCemApiEnergetics.url;
                const params = new URLSearchParams({
                    ...dateParams,
                    ...additionalParams,
                    id: resourceType,
                });

                const datasource = new DataSourceStreamed(
                    schemaConfig.name + "DataSource",
                    new HTTPProtocolStrategyStreamed({
                        headers: {
                            Cookie: authCookie,
                        },
                        method: "GET",
                        url: `${baseUrl}?${params}`,
                    }).setStreamTransformer(JSONStream.parse("*")),
                    new JSONDataTypeStrategy({ resultsPath: "" }),
                    new JSONSchemaValidator(schemaConfig.name + "DataSource", schemaConfig.datasourceJsonSchema)
                );

                const dataStream = await datasource.getAll(false);
                await Promise.race([dataStream.setDataProcessor(onDataFunction).proceed(), sleep(1000)]);

                if (!dataStream.destroyed) {
                    dataStream.destroy();
                }
            };

            before(() => {
                const now = moment().tz(UnimonitorCemApi.API_DATE_TZ);
                const dateFrom = now.clone().subtract(2, "days").format(UnimonitorCemApi.API_DATE_FORMAT);
                const dateTo = now.format(UnimonitorCemApi.API_DATE_FORMAT);

                dateParams = {
                    from: dateFrom,
                    to: dateTo,
                };
            });

            beforeEach(async () => {
                ({ authCookie } = await UnimonitorCemApi.createSession());
            });

            afterEach(async () => {
                await UnimonitorCemApi.terminateSession(authCookie);
            });

            it("Measurement Dataset should return all items", async () => {
                await testVpalacDataset(
                    UnimonitorCemApi.resourceType.Measurement,
                    Energetics.vpalac.measurement,
                    {},
                    async (data: any) => {
                        expect(Object.keys(data).length).to.be.greaterThan(0);
                    }
                );
            });

            it("Measuring Equipment Datasource should return all items", async () => {
                await testVpalacDataset(
                    UnimonitorCemApi.resourceType.MeasuringEquipment,
                    Energetics.vpalac.measuringEquipment,
                    {},
                    async (data: any) => {
                        expect(Object.keys(data).length).to.be.greaterThan(0);
                    }
                );
            });

            it("Meter Type Dataset should return all items", async () => {
                await testVpalacDataset(
                    UnimonitorCemApi.resourceType.MeterType,
                    Energetics.vpalac.meterType,
                    {},
                    async (data: any) => {
                        expect(Object.keys(data).length).to.be.greaterThan(0);
                    }
                );
            });

            it("Type Measuring Equipment Dataset should return all items", async () => {
                await testVpalacDataset(
                    UnimonitorCemApi.resourceType.TypeMeasuringEquipment,
                    Energetics.vpalac.typeMeasuringEquipment,
                    { cis: "135" },
                    async (data: any) => {
                        expect(Object.keys(data).length).to.be.greaterThan(0);
                    }
                );
            });

            it("Units Dataset should return all items", async () => {
                await testVpalacDataset(
                    UnimonitorCemApi.resourceType.Units,
                    Energetics.vpalac.units,
                    { cis: "135" },
                    async (data: any) => {
                        expect(Object.keys(data).length).to.be.greaterThan(0);
                    }
                );
            });
        });
    });

    describe("WazeTT", () => {
        let dataSourcesWazeTTArr: DataSource[];
        beforeEach(() => {
            dataSourcesWazeTTArr = config.datasources.WazeTT.map((sourceUrl: string) => {
                return new DataSource(
                    WazeTT.name + "DataSource",
                    new HTTPProtocolStrategy({
                        headers: {},
                        method: "GET",
                        url: sourceUrl,
                    }),
                    new JSONDataTypeStrategy({ resultsPath: "" }),
                    new JSONSchemaValidator(WazeTT.name + "DataSource", WazeTT.datasourceWazeTTJsonSchema)
                );
            });
        });

        it("should return WazeTT feed object", async () => {
            const data = await dataSourcesWazeTTArr[0].getAll();
            expect(data).to.be.an.instanceOf(Object);
        });
    });
});
