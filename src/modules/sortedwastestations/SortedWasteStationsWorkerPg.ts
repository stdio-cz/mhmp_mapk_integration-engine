"use strict";

import * as  JSONStream from "JSONStream";

import { CustomError } from "@golemio/errors";
import { CityDistricts, Meteosensors, SortedWasteStations } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import {
    DataSourceStreamed,
    HTTPProtocolStrategyStreamed,
    IHTTPSettings,
    JSONDataTypeStrategy,
} from "../../core/datasources";
import { DataSourceStream } from "../../core/datasources/DataSourceStream";
import { log } from "../../core/helpers";
import { MongoModel, PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import {
    IPRSortedWasteStationsTransformation,
} from "./";

import * as _ from "underscore";

export class SortedWasteStationsWorkerPg extends BaseWorker {

    private iprContainersDatasource: DataSourceStreamed;
    private iprStationsDatasource: DataSourceStreamed;
    private oictDatasource: DataSourceStreamed;
    private potexDatasource: DataSourceStreamed;
    private iprTransformation: IPRSortedWasteStationsTransformation;
    private stationsModel: PostgresModel;
    private cityDistrictsModel: MongoModel;
    private sensorsContainersDatasource: DataSourceStreamed;
    private sensorsContainersModel: PostgresModel;
    private sensorsMeasurementsHTTPSettings: IHTTPSettings;
    private sensorsMeasurementsDatasource: DataSourceStreamed;
    private sensorsPicksHTTPSettings: IHTTPSettings;
    private sensorsPicksDatasource: DataSourceStreamed;
    private sensorsMeasurementsModel: PostgresModel;
    private sensorsPicksModel: PostgresModel;

    constructor() {
        super();

        this.iprTransformation = new IPRSortedWasteStationsTransformation();

        const iprContainersHTTPProtocolStrategyStreamed = new HTTPProtocolStrategyStreamed({
            headers: {},
            method: "GET",
            url: config.datasources.IPRSortedWasteContainers,
        });

        iprContainersHTTPProtocolStrategyStreamed.setStreamTransformer(JSONStream.parse("features.*"));

        this.iprContainersDatasource = new DataSourceStreamed(
            SortedWasteStations.ipr.name + "ContainersDataSource",
            iprContainersHTTPProtocolStrategyStreamed,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                SortedWasteStations.ipr.name + "ContainersDataSource",
                SortedWasteStations.ipr.datasourceContainersMongooseSchemaObject,
            ),
        );

        const iprStationsHTTPProtocolStrategyStreamed = new HTTPProtocolStrategyStreamed({
            headers: {},
            method: "GET",
            url: config.datasources.IPRSortedWasteStations,
        });

        iprStationsHTTPProtocolStrategyStreamed.setStreamTransformer(JSONStream.parse("features.*"));

        this.iprStationsDatasource = new DataSourceStreamed(
            SortedWasteStations.ipr.name + "StationsDataSource",
            iprStationsHTTPProtocolStrategyStreamed,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                SortedWasteStations.ipr.name + "StationsDataSource",
                SortedWasteStations.ipr.datasourceStationsMongooseSchemaObject,
            ),
        );

        const oictHTTPProtocolStrategyStreamed = new HTTPProtocolStrategyStreamed({
            headers: {
                Authorization: "Basic " + config.datasources.OICTEndpointApikey,
            },
            method: "GET",
            url: config.datasources.OICTSortedWasteContainers,
        });

        oictHTTPProtocolStrategyStreamed.setStreamTransformer(JSONStream.parse("*"));

        this.oictDatasource = new DataSourceStreamed(
            SortedWasteStations.oict.name + "DataSource",
            oictHTTPProtocolStrategyStreamed,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                SortedWasteStations.oict.name + "DataSource",
                SortedWasteStations.oict.datasourceMongooseSchemaObject,
            ),
        );

        const potexHTTPProtocolStrategyStreamed = new HTTPProtocolStrategyStreamed({
            headers: {},
                method: "GET",
                url: config.datasources.POTEXSortedWasteContainers,
        });

        potexHTTPProtocolStrategyStreamed.setStreamTransformer(JSONStream.parse("places.*"));

        this.potexDatasource = new DataSourceStreamed(SortedWasteStations.potex.name + "DataSource",
            potexHTTPProtocolStrategyStreamed,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(SortedWasteStations.potex.name + "DataSource",
                SortedWasteStations.potex.datasourceMongooseSchemaObject,
            ),
        );

        this.cityDistrictsModel = new MongoModel(CityDistricts.name + "Model", {
            identifierPath: "properties.id",
            mongoCollectionName: CityDistricts.mongoCollectionName,
            outputMongooseSchemaObject: CityDistricts.outputMongooseSchemaObject,
            resultsPath: "properties",
            savingType: "readOnly",
            searchPath: (id, multiple) => (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id },
        },
            new Validator(CityDistricts.name + "ModelValidator", CityDistricts.outputMongooseSchemaObject),
        );

        this.stationsModel = new PostgresModel(
            SortedWasteStations.stations.name + "Model",
            {
                outputSequelizeAttributes: SortedWasteStations.stations.outputSequelizeAttributes,
                pgTableName: SortedWasteStations.stations.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                SortedWasteStations.stations.name + "ModelValidator",
                SortedWasteStations.stations.outputMongooseSchemaObject,
            ),
        );

        const containersHTTPProtocolStrategyStreamed = new HTTPProtocolStrategyStreamed({
            headers: { "x-api-key": config.datasources.SensoneoSortedWasteSensorsApiKey },
            method: "GET",
            url: config.datasources.SensoneoSortedWasteSensors + "/container",
        });

        containersHTTPProtocolStrategyStreamed.setStreamTransformer(JSONStream.parse("containers.*"));

        this.sensorsContainersDatasource =
        new DataSourceStreamed(SortedWasteStations.sensorsContainers.name + "DataSource",
            containersHTTPProtocolStrategyStreamed,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                SortedWasteStations.sensorsContainers.name + "DataSource",
                SortedWasteStations.sensorsContainers.datasourceMongooseSchemaObject,
            ),
        );

        this.sensorsContainersModel =  new PostgresModel(
            SortedWasteStations.sensorsMeasurements.name + "Model",
            {
                outputSequelizeAttributes: SortedWasteStations.sensorsContainers.outputSequelizeAttributes,
                pgTableName: SortedWasteStations.sensorsContainers.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                SortedWasteStations.sensorsContainers.name + "ModelValidator",
                SortedWasteStations.sensorsContainers.outputMongooseSchemaObject,
            ),
        );

        this.sensorsMeasurementsHTTPSettings = {
            body: JSON.stringify({}), // Warning! Data must contains `from` and `to` attributes
            headers: {
                "Content-Type": "application/json",
                "x-api-key": config.datasources.SensoneoSortedWasteSensorsApiKey,
            },
            method: "POST",
            url: config.datasources.SensoneoSortedWasteSensors + "/measurement",
        };

        this.sensorsMeasurementsDatasource =
        new DataSourceStreamed(SortedWasteStations.sensorsMeasurements.name + "DataSource",
            null,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                SortedWasteStations.sensorsMeasurements.name + "DataSource",
                SortedWasteStations.sensorsMeasurements.datasourceMongooseSchemaObject,
            ),
        );

        this.sensorsMeasurementsModel =  new PostgresModel(
            SortedWasteStations.sensorsMeasurements.name + "Model",
            {
                outputSequelizeAttributes: SortedWasteStations.sensorsMeasurements.outputSequelizeAttributes,
                pgTableName: SortedWasteStations.sensorsMeasurements.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                SortedWasteStations.sensorsMeasurements.name + "ModelValidator",
                SortedWasteStations.sensorsMeasurements.outputMongoosePgSchemaObject,
            ),
        );

        this.sensorsPicksHTTPSettings = {
            body: JSON.stringify({}), // Warning! Data must contains `from` and `to` attributes
            headers: {
                "Content-Type": "application/json",
                "x-api-key": config.datasources.SensoneoSortedWasteSensorsApiKey,
            },
            method: "POST",
            url: config.datasources.SensoneoSortedWasteSensors + "/picks",
        };
        this.sensorsPicksDatasource = new DataSourceStreamed(SortedWasteStations.sensorsPicks.name + "DataSource",
            null,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(
                SortedWasteStations.sensorsPicks.name + "DataSource",
                SortedWasteStations.sensorsPicks.datasourceMongooseSchemaObject,
            ),
        );

        this.sensorsPicksModel = new PostgresModel(
            SortedWasteStations.sensorsMeasurements.name + "Model",
            {
                outputSequelizeAttributes: SortedWasteStations.sensorsPicks.outputSequelizeAttributes,
                pgTableName: SortedWasteStations.sensorsPicks.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                SortedWasteStations.sensorsPicks.name + "ModelValidator",
                SortedWasteStations.sensorsPicks.outputMongoosePgSchemaObject,
            ),
        );
    }

    public updateSensorsPicks  = async (msg: any): Promise<void> => {
        let from: Date;
        let to: Date;

        ({from, to} = this.getFromToRange(msg));

        this.sensorsPicksHTTPSettings.body = JSON.stringify({ from, to });

        const pickStrategy = new HTTPProtocolStrategyStreamed(this.sensorsPicksHTTPSettings);
        pickStrategy.setStreamTransformer(JSONStream.parse("picks.*"));
        this.sensorsPicksDatasource.setProtocolStrategy(pickStrategy);

        let dataStream: DataSourceStream;

        try {
            dataStream = (await this.sensorsPicksDatasource.getAll(true));
        } catch (err) {
            throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
        }

        try {
            await dataStream.setDataProcessor(async (data: any) => {
                await this.sensorsPicksModel.save(this.getPicks(data));
            }).proceed();
        } catch (err) {
            throw new CustomError("Error while processing data.", true, this.constructor.name, 5050, err);
        }
    }

    public updateSensorsMeasurement = async (msg: any): Promise<void> => {
        let from: Date;
        let to: Date;

        ({from, to} = this.getFromToRange(msg));

        this.sensorsMeasurementsHTTPSettings.body = JSON.stringify({ from, to });

        const measurementsStrategy = new HTTPProtocolStrategyStreamed(this.sensorsMeasurementsHTTPSettings);
        measurementsStrategy.setStreamTransformer(JSONStream.parse("measurements.*"));
        this.sensorsMeasurementsDatasource.setProtocolStrategy(measurementsStrategy);

        let dataStream: DataSourceStream;

        try {
            dataStream = (await this.sensorsMeasurementsDatasource.getAll(true));
        } catch (err) {
            throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
        }

        try {
            await dataStream.setDataProcessor(async (data: any) => {
                await this.sensorsMeasurementsModel.save(this.getMeasurements(data));
            }).proceed();
        } catch (err) {
            throw new CustomError("Error while processing data.", true, this.constructor.name, 5050, err);
        }
    }

    public updateStationsAndContainers = async (msg: any): Promise<void> => {
        let iprStationsStream: DataSourceStream;
        let iprContainersStream: DataSourceStream;
        let sensorContainersStream: DataSourceStream;
        let oictContainersStream: DataSourceStream;
        let potexContainersStream: DataSourceStream;
        const stationsByIds = {};
        const stationsByCode = {};
        try {
            iprStationsStream = (await this.iprStationsDatasource.getAll(true));
        } catch (err) {
            throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
        }

        try {
            await iprStationsStream.setDataProcessor(async (data: any) => {
                data.forEach((station: any) => {
                    stationsByIds[station.properties.ID] = station;
                });
            }).proceed();

        } catch (err) {
            throw new CustomError(
                "Error while processing data from iprStationsDatasource.", true, this.constructor.name, 5050, err,
            );
        }

        try {
            iprContainersStream = (await this.iprContainersDatasource.getAll(true));
        } catch (err) {
            throw new CustomError(
                "Error while getting iprStationsDatasource data.", true, this.constructor.name, 5050, err,
                );
        }

        try {
            await iprContainersStream.setDataProcessor(async (data: any) => {
                this.getIprContainersByStationCode(data, stationsByIds, stationsByCode);
            }).proceed();

        } catch (err) {
            throw new CustomError(
                "Error while processing data from iprContainersDatasource.", true, this.constructor.name, 5050, err,
                );
        }
        try {
            sensorContainersStream = (await this.sensorsContainersDatasource.getAll(true));
        } catch (err) {
            throw new CustomError(
                "Error while getting sensorsContainersDatasource data.", true, this.constructor.name, 5050, err,
            );
        }

        try {
            await sensorContainersStream.setDataProcessor(async (data: any) => {
                this.getSensorContainersByStationCode(data, stationsByIds, stationsByCode);
            }).proceed();
        } catch (err) {
            throw new CustomError(
                "Error while processing sensorsContainersDatasource data.", true, this.constructor.name, 5050, err,
            );
        }

        try {
            oictContainersStream = (await this.oictDatasource.getAll(true));
        } catch (err) {
            throw new CustomError("Error while getting oictDatasource data.", true, this.constructor.name, 5050, err);
        }

        try {
            await oictContainersStream.setDataProcessor(async (data: any) => {
                this.getOictContainersByStationCode(data, stationsByCode);
            }).proceed();
        } catch (err) {
            throw new CustomError(
                "Error while processing oictDatasource data.", true, this.constructor.name, 5050, err,
            );
        }

        try {
            potexContainersStream = (await this.potexDatasource.getAll(true));
        } catch (err) {
            throw new CustomError("Error while getting potexDatasource data.", true, this.constructor.name, 5050, err);
        }

        try {
            await potexContainersStream.setDataProcessor(async (data: any) => {
                this.getPotexContainersByStationCode(data, stationsByCode);
            }).proceed();
        } catch (err) {
            throw new CustomError(
                "Error while processing potexDatasource data.", true, this.constructor.name, 5050, err,
            );
        }

        try {
            await this.saveStationsAndContainers(stationsByCode);
        } catch (err) {
            throw new CustomError("Error while saving data.", true, this.constructor.name, 5050, err);
        }
    }

    private saveStationsAndContainers = async (stationsByCode: any): Promise<void> => {
        let containers = [];

        log.verbose("Saving saveStationsAndContainers");

        let stations = Object.keys(stationsByCode).map((stationCode: any) => {
            containers = containers.concat(stationsByCode[stationCode].containers);
            return this.transformStationForDB(stationCode, stationsByCode[stationCode]);
        });

        stations = await this.updateDistrict (stations, false, false, true);

        log.verbose("Saving stations");
        await this.stationsModel.saveBySqlFunction(
            stations,
            ["code"],
        );

        log.verbose("Saving containers");
        await this.sensorsContainersModel.saveBySqlFunction(
            containers,
            ["code"],
        );

        return;
    }

    private updateDistrict = async (
        stations: any,
        onlyNew = false,
        getOnlyChanged = false,
        force = false,
    ): Promise<[]> => {
        const promises = [];

        const updateStation = (station: any) => async () => {
            let stationInDb: any;

            if (!force) {
                stationInDb = await this.stationsModel.findOne({
                    where: {
                        code: station.code,
                    },
                });
            } else {
                stationInDb = {};
            }

            if (onlyNew && stationInDb.code) {
                station.district = null;
                return {};
            }

            if (force || !stationInDb?.district
            || `${station.latitude}` !== `${stationInDb?.latitude}`
            || `${station.longitude}` !== `${stationInDb?.longitude}`) {
                try {
                    const result = await this.cityDistrictsModel.findOne({ // find district by coordinates
                        geometry: {
                            $geoIntersects: {
                                $geometry: {
                                    coordinates: [station.longitude, station.latitude],
                                    type: "Point",
                                },
                            },
                        },
                    });

                    station.district = (result) ? result.properties.name : null;
                    station.district_code = (result) ? result.properties.id : null;

                    // should be here ?
                    if (!station.district) {
                    //     await dbData.remove();
                        // log.debug("District was not found. Object '" + station.code + "' removed.");
                    }
                } catch (err) {
                    throw new CustomError("Error while updating district.", true, this.constructor.name, 5001, err);
                }
            } else if (getOnlyChanged) {
                station.district = null;
            }

        };

        log.verbose("Updating districts");

        stations.map((station: any) => {
            promises.push(updateStation(station)());
        });

        await Promise.all(promises);

        return stations.filter((station: any) => {
            return !!station.district;
        });
    }

    private transformStationForDB = (code: string, station: any) => {
        return {
            accessibility: this.iprTransformation.getAccessibilityByString(station.station.properties.PRISTUP).id,
            address: station.station.properties.STATIONNAME,
            code,
            district: station.station.properties.CITYDISTRICT,
            district_code: null,
            latitude: station.station.geometry.coordinates[1],
            longitude: station.station.geometry.coordinates[0],
            source: station.station.properties.SOURCE,
        };
    }

    private getPotexContainersByStationCode = (containers: any, stationsByCode: any): any => {
        const stationCodes = Object.keys(stationsByCode);
        const containerCodes = [];
        // tslint:disable: object-literal-sort-keys variable-name
        containers.forEach((container: any) => {
            let found = false;
            for (const stationCode of stationCodes) {
                const distance = this.calculateDistanceBetweenPoints(
                    [container.lng, container.lat],
                    stationsByCode[stationCode].station.geometry.coordinates,
                );

                if (distance < 30) {
                    found = true;
                    const code = `${stationCode}C${[container.lng, container.lat].join("-")}`;

                    if (!containerCodes.includes(code)) {
                        containerCodes.push(code);
                        stationsByCode[stationCode].containers.push({
                            code,
                            cleaning_frequency_interval: 0,
                            cleaning_frequency_frequency: 0,
                            station_code: stationCode,
                            total_volume: null,
                            trash_type: 8,
                            prediction: null,
                            bin_type: null,
                            installed_at: null,
                            network: null,
                            source: "potex",
                        });
                    }
                    break;
                }
            }

            if (!found) {
                const stationCode = [container.lng, container.lat].join("/");
                const newStation = this.getNewPotexStation(container, stationCode);

                if (!stationsByCode[stationCode]) {
                    stationsByCode[stationCode] = newStation;
                }
                const code = `${stationCode}C${container.city}`;

                if (!containerCodes.includes(code)) {
                    containerCodes.push(code);
                    stationsByCode[stationCode].containers.push({
                        code,
                        cleaning_frequency_interval: 0,
                        cleaning_frequency_frequency: 0,
                        station_code: stationCode,
                        total_volume: null,
                        trash_type: 8,
                        prediction: null,
                        bin_type: null,
                        installed_at: null,
                        network: null,
                        source: "potex",
                    });
                }
            }
        });
        // tslint:enable
        return stationsByCode;
    }

    private getNewPotexStation = (container: any, stationCode: string) => {
        // tslint:disable: object-literal-sort-keys variable-name
        return {
            station: {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [container.lng, container.lat],
              },
              properties: {
                OBJECTID: null,
                ID: null,
                STATIONNUMBER: stationCode,
                STATIONNAME: container.address,
                CITYDISTRICTRUIANCODE: null,
                CITYDISTRICT: container.city,
                PRISTUP: null,
                SOURCE: "potex",
              },
            },
            containers: [],
        };
        // tslint:enable
    }

    private getOictContainersByStationCode = (containers: any, stationsByCode: any): any => {
        const stationCodes = Object.keys(stationsByCode);
        // tslint:disable: object-literal-sort-keys variable-name

        containers.forEach((container: any) => {
            let found = false;
            for (const stationCode of stationCodes) {

                const distance = this.calculateDistanceBetweenPoints(
                    container.coordinates,
                    stationsByCode[stationCode].station.geometry.coordinates,
                );

                if (distance < 30) {
                    found = true;

                    stationsByCode[stationCode].containers.push({
                        code: `${stationCode}C${container.unique_id
                            .replace("diakonie-broumov_", "")}`,
                        cleaning_frequency_interval: Math.floor((container?.cleaning_frequency || 0) / 10),
                        cleaning_frequency_frequency: (container?.cleaning_frequency || 0) % 10,
                        station_code: stationCode,
                        total_volume: null,
                        trash_type: this.iprTransformation.getTrashTypeByString(container?.trash_type).id,
                        prediction: null,
                        bin_type: null,
                        installed_at: null,
                        network: null,
                        source: "oict",
                    });
                    break;
                }
            }

            if (!found) {
                const stationCode = container.coordinates.join("/");
                const newStation = this.getNewOictStation(container, stationCode);

                if (!stationsByCode[stationCode]) {
                    stationsByCode[stationCode] = newStation;
                } else {
                    stationsByCode[stationCode].containers.concat(newStation.containers);
                }
            }
        });
        // tslint:enable
        return stationsByCode;
    }

    private getNewOictStation = (container: any, stationCode: string) => {
        // tslint:disable: object-literal-sort-keys variable-name
        return {
            station: {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: container.coordinates,
              },
              properties: {
                OBJECTID: null,
                ID: null,
                STATIONNUMBER: stationCode,
                STATIONNAME: container.address,
                CITYDISTRICTRUIANCODE: null,
                CITYDISTRICT: container.district,
                PRISTUP: container.accessibility,
                SOURCE: "oict",
              },
            },
            containers: [
              {
                code: `${stationCode}C${container.unique_id
                    .replace("diakonie-broumov_", "")}`,
                cleaning_frequency_interval: Math.floor((container?.cleaning_frequency || 0) / 10),
                cleaning_frequency_frequency: (container?.cleaning_frequency || 0) % 10,
                station_code: stationCode,
                total_volume: null,
                trash_type: this.iprTransformation.getTrashTypeByString(container?.trash_type).id,
                prediction: null,
                bin_type: null,
                installed_at: null,
                network: null,
                source: "oict",
              },
            ],
        };
        // tslint:enable
    }

    private getIprContainersByStationCode = (containers: any, stations: any, stationsByCode: any): any => {
        containers.forEach((container: any) => {
            // tslint:disable: object-literal-sort-keys variable-name
            const station_code = (
                stations[container?.properties?.STATIONID] || {}
                )?.properties?.STATIONNUMBER || "unknown";
            if (!stationsByCode[station_code]) {
                stationsByCode[station_code] = {
                    station: stations[container?.properties?.STATIONID],
                    containers: [],
                };
                if (!stationsByCode[station_code].station) {
                    stationsByCode[station_code].station = {
                        type: "Feature",
                        geometry: {
                          type: "Point",
                          coordinates: container.coordinates,
                        },
                        properties: {
                          OBJECTID: null,
                          ID: container?.properties?.OBJECTID,
                          STATIONNUMBER: container?.properties?.STATIONID,
                          STATIONNAME: null,
                          CITYDISTRICTRUIANCODE: null,
                          CITYDISTRICT: null,
                          PRISTUP: null,
                          SOURCE: "ipr",
                        },
                    };
                }
                stationsByCode[station_code].station.properties.SOURCE = "ipr";
            }

            stationsByCode[station_code].containers.push({
                code: `${station_code}C${container?.properties?.OBJECTID}`,
                cleaning_frequency_interval: Math.floor((container?.properties?.CLEANINGFREQUENCYCODE || 0) / 10),
                cleaning_frequency_frequency: (container?.properties?.CLEANINGFREQUENCYCODE || 0) % 10,
                station_code,
                total_volume: container.total_volume,
                trash_type: this.iprTransformation.getTrashTypeByString(container?.properties?.TRASHTYPENAME).id,
                prediction: container.prediction,
                bin_type: container?.properties?.CONTAINERTYPE,
                installed_at: container.installed_at,
                network: container.network,
                source: "ipr",
            });
            // tslint:enable
        });
        return stationsByCode;
    }

    private getSensorContainersByStationCode = (containers: any, stations: any, stationsByCode: any): any => {
        containers.forEach((container: any) => {
            // tslint:disable: object-literal-sort-keys variable-name
            const station_code = this.getStationCode(container.code);

            if (!stationsByCode[station_code]) {
                stationsByCode[station_code] = {
                    station: stations[container?.properties?.STATIONID],
                    containers: [],
                };
                if (!stationsByCode[station_code].station) {
                    stationsByCode[station_code].station = {
                        type: "Feature",
                        geometry: {
                          type: "Point",
                          coordinates: [container.longitude, container.latitude],
                        },
                        properties: {
                          OBJECTID: null,
                          ID: container.id,
                          STATIONNUMBER: station_code,
                          STATIONNAME: container.address,
                          CITYDISTRICTRUIANCODE: null,
                          CITYDISTRICT: container.district,
                          PRISTUP: 3,
                          SOURCE: "sensoneo",
                        },
                    };
                }
                stationsByCode[station_code].station.properties.SOURCE = "sensoneo";
            }

            const trashType = this.iprTransformation.getTrashTypeByString(container.trash_type).id;
            let containerUpdated = false;

            for (const storedContainer of stationsByCode[station_code].containers) {
                if (trashType === storedContainer.trash_type) {
                    storedContainer.code = container.code;
                    storedContainer.station_code = this.getStationCode(container.code);
                    storedContainer.total_volume = container.total_volume;
                    storedContainer.trash_type = this.iprTransformation.getTrashTypeByString(container.trash_type).id;
                    storedContainer.prediction = container.prediction;
                    storedContainer.bin_type = container.bin_type;
                    storedContainer.installed_at = container.installed_at;
                    storedContainer.network = container.network;
                    storedContainer.source = "sensoneo",
                    containerUpdated = true;
                    break;
                }
            }

            if (!containerUpdated) {
                stationsByCode[station_code].containers.push({
                    trash_type: trashType,
                    code: container.code,
                    station_code: this.getStationCode(container.code),
                    total_volume: container.total_volume,
                    prediction: container.prediction,
                    bin_type: container.bin_type,
                    installed_at: container.installed_at,
                    network: container.network,
                    source: "sensoneo",
                });
            }

            // tslint:enable
        });
        return stationsByCode;
    }

    private getFromToRange = (msg: any): any => {
        let from: Date;
        let to: Date;
        try {
            const customInterval = JSON.parse(msg.content.toString());
            if (customInterval.from && customInterval.to) {
                from = new Date(customInterval.from);
                to = new Date(customInterval.to);
                log.debug(`Interval from: ${from} to ${to} was used.`);
            } else {
                throw new Error("Interval must contain from and to properties.");
            }
        } catch (err) {
            to = new Date();
            from = new Date();
            from.setHours(to.getHours() - 6);
        }

        return {
            from,
            to,
        };
    }

    private getMeasurements = (containers: any): any => {
        return containers.map((container: any) => {
            // tslint:disable: object-literal-sort-keys
            return {
                container_code: container.code,
                percent_calculated: container.percent_calculated,
                upturned: container.upturned,
                temperature: container.temperature,
                battery_status: container.battery_status,
                measured_at: container.measured_at,
                measured_at_utc: container.measured_at_utc,
                prediction: container.prediction,
                prediction_utc: container.prediction_utc,
                firealarm: container.firealarm,
            };
            // tslint:enable
        });
    }

    private getPicks = (containers: any): any => {
        return containers.map((container: any) => {
            // tslint:disable: object-literal-sort-keys
            return {
                container_code: container.code,
                percent_before: container.percent_before,
                percent_now: container.percent_now,
                event_driven: container.event_driven,
                decrease: container.decrease,
                pick_at: container.pick_at,
                pick_at_utc: container.pick_at_utc,
                pick_minfilllevel: container.pick_minfilllevel,
            };
            // tslint:enable
        });
    }

    private getStationCode = (containerCode: string): string => {
        return containerCode?.split("C")[0] || "unknown";
    }

    private calculateDistanceBetweenPoints = (coord1, coord2) => {
        const [lng1, lat1] = coord1;
        const [lng2, lat2] = coord2;

        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1); // deg2rad below
        const dLng = this.deg2rad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
            ;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c * 1000; // Distance in m
        return d;
    }

    private deg2rad = (deg) => {
        return deg * (Math.PI / 180);
    }
}
