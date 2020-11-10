"use strict";

import * as  JSONStream from "JSONStream";

import axios, {
    AxiosRequestConfig,
    AxiosResponse,
    Method,
} from "axios";

import { CustomError } from "@golemio/errors";
import { CityDistricts, SortedWasteStations } from "@golemio/schema-definitions";
import { JSONSchemaValidator, Validator } from "@golemio/validator";
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
    SortedWasteTransformation,
} from "./";

export class SortedWasteStationsWorkerPg extends BaseWorker {
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
    private ksnkoStationsDatasource: DataSourceStreamed;
    private sortedWasteTransformation: SortedWasteTransformation;

    constructor() {
        super();

        this.sortedWasteTransformation = new SortedWasteTransformation();
        this.iprTransformation = new IPRSortedWasteStationsTransformation();

        this.ksnkoStationsDatasource = new DataSourceStreamed(
            SortedWasteStations.ksnko.name + "StationsDataSource",
            null,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(
                SortedWasteStations.ksnko.name + "StationsDataSource",
                SortedWasteStations.ksnko.ksnkoStationsJSONSchema,
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
            SortedWasteStations.sensorsContainers.name + "Model",
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
                await this.sensorsPicksModel.save(this.sortedWasteTransformation.getPicks(data));
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
                await this.sensorsMeasurementsModel.save(this.sortedWasteTransformation.getMeasurements(data));
            }).proceed();
        } catch (err) {
            throw new CustomError("Error while processing data.", true, this.constructor.name, 5050, err);
        }
    }

    public getKSNKOToken = async (): Promise<AxiosResponse> => {
        return (await axios.request({
            data : JSON.stringify({
                password: config.datasources.KSNKO.pass,
                username: config.datasources.KSNKO.user,
            }),
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            method: "POST" as Method,
            url: `${config.datasources.KSNKO.url}/login`,
        } as AxiosRequestConfig))?.data?.token;
    }

    public updateStationsAndContainers = async (msg: any): Promise<void> => {
        let ksnkoStationsStream: DataSourceStream;
        let token: any;
        let sensorContainersStream: DataSourceStream;
        let oictContainersStream: DataSourceStream;
        let potexContainersStream: DataSourceStream;
        let stationsByCode = {};

        try {
            token = (await this.getKSNKOToken());
            if (!token) {
                throw new Error("Can not obtain KSNKO auth token");
            }
        } catch (err) {
            throw new CustomError("Error while getting KSNKO token.", true, this.constructor.name, 5050, err);
        }

        const ksnkoStationsHTTPProtocolStrategyStreamed = new HTTPProtocolStrategyStreamed({
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            method: "GET",
            url: `${config.datasources.KSNKO.url}/stations?full=1&detail=1`,
        });

        ksnkoStationsHTTPProtocolStrategyStreamed.setStreamTransformer(JSONStream.parse("data.*"));

        this.ksnkoStationsDatasource.setProtocolStrategy(
            ksnkoStationsHTTPProtocolStrategyStreamed,
        );

        try {
            ksnkoStationsStream = (await this.ksnkoStationsDatasource.getAll(true));
        } catch (err) {
            throw new CustomError("Error while getting data from KSNKO.", true, this.constructor.name, 5050, err);
        }

        try {
            await ksnkoStationsStream.setDataProcessor(async (data: any) => {
                stationsByCode = { ...stationsByCode, ...this.sortedWasteTransformation.getKsnkoStationsByCode(data)};
            }).proceed();

        } catch (err) {
            throw new CustomError(
                "Error while processing data from ksnkoStationsDatasource.", true, this.constructor.name, 5050, err,
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
                stationsByCode = this.sortedWasteTransformation.getSensorContainersByStationCode(data, stationsByCode);
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
                stationsByCode = this.sortedWasteTransformation.getOictContainersByStationCode(data, stationsByCode);
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
                stationsByCode = this.sortedWasteTransformation.getPotexContainersByStationCode(data, stationsByCode);
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
            return stationsByCode[stationCode].station;
        });

        stations = await this.updateDistrict (stations, false, false, true);

        log.verbose("Saving stations");

        await this.stationsModel.saveBySqlFunction(
            this.uniqueArrat(stations, "code"),
            ["code"],
        );

        log.verbose("Saving containers");

        // await this.sensorsContainersModel.save(
        //          this.uniqueArrat(containers, "code"));

        await this.sensorsContainersModel.saveBySqlFunction(
            this.uniqueArrat(containers, "code"),
            ["code"],
        );

        return;
    }

    private uniqueArrat = (arr: any[], prop: any) => {
        const arrP = arr.map((el: any) => el[prop]);
        return arr.filter( (obj: any, index: number) => {
            return arrP.indexOf(obj[prop]) === index;
        });
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

                    station.district = (result) ? result.properties.slug : null;
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
            from.setHours(to.getHours() - (24 * 7));
        }

        return {
            from,
            to,
        };
    }
}
