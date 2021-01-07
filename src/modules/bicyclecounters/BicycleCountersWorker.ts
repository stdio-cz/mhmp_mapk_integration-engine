"use strict";

import { CustomError } from "@golemio/errors";
import { BicycleCounters, Counters } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as moment from "moment-timezone";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import {
    ApiLogsFailuresTransformation,
    ApiLogsHitsTransformation,
    CameaMeasurementsTransformation,
    CameaTransformation,
    EcoCounterMeasurementsTransformation,
    EcoCounterTransformation,
} from "./";

export enum CameaRefreshDurations {
    last3Hours,
    previousDay,
    specificDay,
}

export class BicycleCountersWorker extends BaseWorker {

    private dataSourceCamea: DataSource;
    private dataSourceCameaMeasurements: DataSource;
    private dataSourceEcoCounter: DataSource;
    private dataSourceEcoCounterMeasurements: DataSource;
    private dataSourceApiLogsFailures: DataSource;
    private dataSourceApiLogsHits: DataSource;

    private apiLogsFailuresTransformation: ApiLogsFailuresTransformation;
    private apiLogsHitsTransformation: ApiLogsHitsTransformation;
    private cameaTransformation: CameaTransformation;
    private ecoCounterTransformation: EcoCounterTransformation;
    private cameaMeasurementsTransformation: CameaMeasurementsTransformation;
    private ecoCounterMeasurementsTransformation: EcoCounterMeasurementsTransformation;

    private apiLogsFailuresModel: PostgresModel;
    private apiLogsHitsModel: PostgresModel;
    private locationsModel: PostgresModel;
    private directionsModel: PostgresModel;
    private detectionsModel: PostgresModel;
    private temperaturesModel: PostgresModel;
    private queuePrefix: string;
/*
    private countersLocationsModel: PostgresModel;
    private countersDirectionsModel: PostgresModel;
    private countersDetectionsModel: PostgresModel;
*/
    constructor() {
        super();

        this.dataSourceCamea = new DataSource(BicycleCounters.camea.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.BicycleCountersCamea,
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(BicycleCounters.camea.name + "DataSource",
                BicycleCounters.camea.datasourceMongooseSchemaObject));
        this.dataSourceCameaMeasurements = new DataSource(BicycleCounters.camea.name + "MeasurementsDataSource",
            undefined,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(BicycleCounters.camea.name + "MeasurementsDataSource",
                BicycleCounters.camea.measurementsDatasourceMongooseSchemaObject));
        this.cameaTransformation = new CameaTransformation();
        this.cameaMeasurementsTransformation = new CameaMeasurementsTransformation();

        this.dataSourceEcoCounter = new DataSource(BicycleCounters.ecoCounter.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {
                    Authorization: `Bearer ${config.datasources.CountersEcoCounterTokens.PRAHA}`,
                },
                method: "GET",
                url: config.datasources.BicycleCountersEcoCounter,
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(BicycleCounters.ecoCounter.name + "DataSource",
                BicycleCounters.ecoCounter.datasourceMongooseSchemaObject));
        this.dataSourceEcoCounterMeasurements = new DataSource(BicycleCounters.ecoCounter.name
                + "MeasurementsDataSource",
            undefined,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(BicycleCounters.ecoCounter.name + "MeasurementsDataSource",
                BicycleCounters.ecoCounter.measurementsDatasourceMongooseSchemaObject));
        this.ecoCounterTransformation = new EcoCounterTransformation();
        this.ecoCounterMeasurementsTransformation = new EcoCounterMeasurementsTransformation();

        this.dataSourceApiLogsFailures = new DataSource(BicycleCounters.apiLogsFailures.name + "DataSource",
            undefined,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(BicycleCounters.apiLogsFailures.name + "ApiLogsFailuresDataSource",
                BicycleCounters.apiLogsFailures.datasourceMongooseSchemaObject),
            );

        this.dataSourceApiLogsHits = new DataSource(BicycleCounters.apiLogsHits.name + "DataSource",
            undefined,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(BicycleCounters.apiLogsHits.name + "ApiLogsHitsDataSource",
                BicycleCounters.apiLogsHits.datasourceMongooseSchemaObject),
            );

        this.apiLogsFailuresTransformation = new ApiLogsFailuresTransformation();
        this.apiLogsHitsTransformation = new ApiLogsHitsTransformation();

        this.apiLogsFailuresModel = new PostgresModel(
            BicycleCounters.apiLogsFailures.name + "Model",
            {
                outputSequelizeAttributes: BicycleCounters.apiLogsFailures.outputSequelizeAttributes,
                pgTableName: BicycleCounters.apiLogsFailures.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                BicycleCounters.apiLogsFailures.name + "ModelValidator",
                BicycleCounters.apiLogsFailures.outputMongooseSchemaObject,
            ),
        );
        this.apiLogsHitsModel = new PostgresModel(
            BicycleCounters.apiLogsHits.name + "Model",
            {
                outputSequelizeAttributes: BicycleCounters.apiLogsHits.outputSequelizeAttributes,
                pgTableName: BicycleCounters.apiLogsHits.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                BicycleCounters.apiLogsHits.name + "ModelValidator",
                BicycleCounters.apiLogsHits.outputMongooseSchemaObject,
            ),
        );
        this.locationsModel = new PostgresModel(
            BicycleCounters.locations.name + "Model",
            {
                outputSequelizeAttributes: BicycleCounters.locations.outputSequelizeAttributes,
                pgTableName: BicycleCounters.locations.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                BicycleCounters.locations.name + "ModelValidator",
                BicycleCounters.locations.outputMongooseSchemaObject,
            ),
        );
        this.directionsModel = new PostgresModel(
            BicycleCounters.directions.name + "Model",
            {
                outputSequelizeAttributes: BicycleCounters.directions.outputSequelizeAttributes,
                pgTableName: BicycleCounters.directions.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                BicycleCounters.directions.name + "ModelValidator",
                BicycleCounters.directions.outputMongooseSchemaObject,
            ),
        );
        this.detectionsModel = new PostgresModel(
            BicycleCounters.detections.name + "Model",
            {
                outputSequelizeAttributes: BicycleCounters.detections.outputSequelizeAttributes,
                pgTableName: BicycleCounters.detections.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                BicycleCounters.detections.name + "ModelValidator",
                BicycleCounters.detections.outputMongooseSchemaObject,
            ),
        );
        this.temperaturesModel = new PostgresModel(
            BicycleCounters.temperatures.name + "Model",
            {
                outputSequelizeAttributes: BicycleCounters.temperatures.outputSequelizeAttributes,
                pgTableName: BicycleCounters.temperatures.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                BicycleCounters.temperatures.name + "ModelValidator",
                BicycleCounters.temperatures.outputMongooseSchemaObject,
            ),
        );
/*
        this.countersLocationsModel = new PostgresModel(
            Counters.locations.name + "Model",
            {
                outputSequelizeAttributes: Counters.locations.outputSequelizeAttributes,
                pgTableName: Counters.locations.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                BicycleCounters.locations.name + "ModelValidator",
                BicycleCounters.locations.outputMongooseSchemaObject,
            ),
        );
        this.countersDirectionsModel = new PostgresModel(
            Counters.directions.name + "Model",
            {
                outputSequelizeAttributes: Counters.directions.outputSequelizeAttributes,
                pgTableName: Counters.directions.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                BicycleCounters.directions.name + "ModelValidator",
                BicycleCounters.directions.outputMongooseSchemaObject,
            ),
        );
        this.countersDetectionsModel = new PostgresModel(
            Counters.detections.name + "Model",
            {
                outputSequelizeAttributes: Counters.detections.outputSequelizeAttributes,
                pgTableName: Counters.detections.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                BicycleCounters.detections.name + "ModelValidator",
                BicycleCounters.detections.outputMongooseSchemaObject,
            ),
        );
*/
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + BicycleCounters.name.toLowerCase();
    }

    public getApiLogs = async (): Promise<void> => {
        const now = Math.round(new Date().getTime() / 1000);

        await this.getApiLogsData(
            "hit",
            now - config.datasources.BicycleCountersStatPing.startOffsetSec,
            now,
        );

        await this.getApiLogsData(
            "fail",
            now - config.datasources.BicycleCountersStatPing.startOffsetSec,
            now,
        );
    }

    public saveApiLogs = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        let transformation: ApiLogsHitsTransformation | ApiLogsFailuresTransformation;
        let model: PostgresModel;

        switch (inputData.type) {
            case "hit":
                transformation = this.apiLogsHitsTransformation;
                model = this.apiLogsHitsModel;
                break;
            case "fail":
                transformation = this.apiLogsFailuresTransformation;
                model = this.apiLogsFailuresModel;
                break;

          }

        const data =  await transformation.transform(inputData.data);

        await model.save(data);
    }

    public refreshCameaDataLastXHoursInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSourceCamea.getAll();
        const transformedData = await this.cameaTransformation.transform(data);
        await this.locationsModel.save(transformedData.locations);
        await this.directionsModel.save(transformedData.directions);

        // send messages for updating measurements data
        const promises = transformedData.locations.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateCamea",
                JSON.stringify({ id: p.vendor_id, duration: CameaRefreshDurations.last3Hours }));
        });
        await Promise.all(promises);
    }

    public refreshCameaDataPreviousDayInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSourceCamea.getAll();
        const transformedData = await this.cameaTransformation.transform(data);
        await this.locationsModel.save(transformedData.locations);
        await this.directionsModel.save(transformedData.directions);

        // send messages for updating measurements data
        const promises = transformedData.locations.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateCamea",
                JSON.stringify({ id: p.vendor_id, duration: CameaRefreshDurations.previousDay }));
        });
        await Promise.all(promises);
    }

    public refreshCameaDataSpecificDayInDB = async (msg: any): Promise<void> => {
        let inputData: any;
        try {
            inputData = JSON.parse(msg.content.toString());
        } catch (err) {
            throw new CustomError("Message has to be JSON.", true, this.constructor.name, 5003, err);
        }

        if (!inputData.date) {
            throw new CustomError("Message must contain the date property.", true, this.constructor.name, 5003);
        }

        const data = await this.dataSourceCamea.getAll();
        const transformedData = await this.cameaTransformation.transform(data);
        await this.locationsModel.save(transformedData.locations);
        await this.directionsModel.save(transformedData.directions);

        // send messages for updating measurements data
        const promises = transformedData.locations.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateCamea",
                JSON.stringify({
                    date: inputData.date as string,
                    duration: CameaRefreshDurations.specificDay,
                    id: p.vendor_id,
                }));
        });
        await Promise.all(promises);
    }

    public updateCamea = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const id = inputData.id as string;
        const duration = inputData.duration as CameaRefreshDurations;

        const now = moment.utc();
        let from: string;
        let to: string;

        switch (duration) {
            case CameaRefreshDurations.last3Hours:
                const step = 5;
                const remainder = step - (now.minute() % step);
                // rounded to nearest next 5 minutes
                const nowRounded = now.clone().add(remainder, "minutes").seconds(0).milliseconds(0);
                const nowMinus12h = nowRounded.clone().subtract(3, "hours");
                to = nowRounded.format("YYYY-MM-DD HH:mm:ss");
                from = nowMinus12h.format("YYYY-MM-DD HH:mm:ss");
                break;
            case CameaRefreshDurations.previousDay:
                const todayStart = now.clone().hours(0).minutes(0).seconds(0).milliseconds(0);
                const yesterdayStart = todayStart.clone().subtract(1, "day");
                to = todayStart.format("YYYY-MM-DD HH:mm:ss");
                from = yesterdayStart.format("YYYY-MM-DD HH:mm:ss");
                break;
            case CameaRefreshDurations.specificDay:
                const date = inputData.date as string;
                const dayStart = moment(date).hours(0).minutes(0).seconds(0).milliseconds(0);
                const nextDayStart = dayStart.clone().add(1, "day");
                to = nextDayStart.format("YYYY-MM-DD HH:mm:ss");
                from = dayStart.format("YYYY-MM-DD HH:mm:ss");
                break;
            default:
                throw new CustomError(`Undefined Camea refresh duration value.`, true, this.constructor.name, 5001);
        }

        let url = config.datasources.BicycleCountersCameaMeasurements;
        url = url.replace(":id", id);
        url = url.replace(":from", from);
        url = url.replace(":to", to);

        this.dataSourceCameaMeasurements.setProtocolStrategy(new HTTPProtocolStrategy({
            headers: {},
            json: true,
            method: "GET",
            url,
        }));

        const data = await this.dataSourceCameaMeasurements.getAll();
        const transformedData = await this.cameaMeasurementsTransformation.transform(data);

        await this.detectionsModel.saveBySqlFunction(
            transformedData.detections,
            [ "locations_id", "directions_id", "measured_from" ],
        );
        await this.temperaturesModel.saveBySqlFunction(
            transformedData.temperatures,
            [ "locations_id", "measured_from" ],
        );
    }

    public refreshEcoCounterDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSourceEcoCounter.getAll();

        const transformedData = await this.ecoCounterTransformation.transform(data);

        await this.locationsModel.save(transformedData.locations);
        await this.directionsModel.save(transformedData.directions);
/*
        await this.countersLocationsModel.save(transformedData.locationsPedestrians);
        await this.countersDirectionsModel.save(transformedData.directionsPedestrians);
*/
        // send messages for updating measurements data
        const promisesBicycles = transformedData.directions.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateEcoCounter",
                JSON.stringify({
                    category: "bicycle",
                    directions_id: p.id,
                    id: p.vendor_id,
                    locations_id: p.locations_id,
                }));
        });
/*
        const promisesPeds = transformedData.directionsPedestrians.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateEcoCounter",
                JSON.stringify({
                    category: "pedestrian",
                    directions_id: p.id,
                    id: p.vendor_id,
                    locations_id: p.locations_id,
                }));
        });
*/
        await Promise.all(promisesBicycles);
//        await Promise.all(promisesPeds);
    }

    public updateEcoCounter = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const locationsId = inputData.locations_id;
        const directionsId = inputData.directions_id;
        const category = inputData.category;
        const id = inputData.id;

        // EcoCounter API is actually working with local Europe/Prague time, not ISO!!!
        // so we have to send local time to request.
        // Furthermore, the returned dates are START of the measurement interval, so if we want measurements
        // from interval between 06:00 and 07:00 UTC (which is local 07:00 - 08:00), we have to send parameters
        // from=07:00 and to=07:45, because it returns all the measurements where from and to parameters are INCLUDED.
        const now = moment.utc().tz("Europe/Prague");
        const step = 15;
        const remainder = (now.minute() % step);
        // rounded to nearest next 15 minutes
        const nowRounded = now.clone().subtract(remainder, "minutes").seconds(0).milliseconds(0);
        const strTo = nowRounded.clone().subtract(step, "minutes").format("YYYY-MM-DDTHH:mm:ss");
        const strFrom = nowRounded.clone().subtract(12, "hours").format("YYYY-MM-DDTHH:mm:ss");

        let url = config.datasources.BicycleCountersEcoCounterMeasurements;
        url = url.replace(":id", id);
        url = url.replace(":from", strFrom);
        url = url.replace(":to", strTo);
        url = url.replace(":step", `${step}m`);
        url = url.replace(":complete", "true");

        this.dataSourceEcoCounterMeasurements.setProtocolStrategy(new HTTPProtocolStrategy({
            headers: {
                Authorization: `Bearer ${config.datasources.CountersEcoCounterTokens.PRAHA}`,
            },
            json: true,
            method: "GET",
            url,
        }));

        const data = await this.dataSourceEcoCounterMeasurements.getAll();

        if (category === "bicycle") {
            await this.detectionsModel.saveBySqlFunction(
                (await this.ecoCounterMeasurementsTransformation.transform(
                    data,
                )).map((x: any) => {
                    x.directions_id = directionsId;
                    x.locations_id = locationsId;
                    return x;
                }),
                [ "locations_id", "directions_id", "measured_from" ],
            );
        }
/*
        // pedestrians
        if (category === "pedestrian") {
            await this.countersDetectionsModel.saveBySqlFunction(
                (await this.ecoCounterMeasurementsTransformation.transform(
                    data,
                )).map((x: any) => {
                    x.directions_id = directionsId;
                    x.locations_id = locationsId;
                    x.category = "pedestrian";
                    return x;
                }),
                [ "locations_id", "directions_id", "measured_from", "category" ],
            );
        }
*/
    }

    private getApiLogsData = async (
        type: "hit" | "fail",
        startTS: number,
        endTS: number,
    ): Promise<void> => {
        let dataSource: DataSource;
        let statpingUrl = config.datasources.BicycleCountersStatPing.url;
        let offset: number = 0;
        let hasData = true;

        const messagePromises = [];

        switch (type) {
            case "hit":
              dataSource = this.dataSourceApiLogsHits;
              statpingUrl += "/hits";
              break;
            case "fail":
                dataSource = this.dataSourceApiLogsFailures;
                statpingUrl += "/failures";
                break;
            default:
                dataSource = this.dataSourceApiLogsHits;
                statpingUrl += "/hits";
          }

        do {
            dataSource.setProtocolStrategy(new HTTPProtocolStrategy({
                headers: {},
                json: true,
                method: "GET",
                // spreading the interval just for sure
                url: `${statpingUrl}?start=${startTS - 1}&end=${endTS + 1}\
&offset=${offset}&limit=${config.datasources.BicycleCountersStatPing.batchLimit}`,
            }));

            const data = await dataSource.getAll();

            if (data && Array.isArray(data) && data.length > 0) {
                messagePromises.push(this.sendMessageToExchange("workers." + this.queuePrefix + ".saveApiLogs",
                    JSON.stringify({
                        data,
                        type,
                    }),
                ));
            } else {
                hasData = false;
            }

            offset += config.datasources.BicycleCountersStatPing.batchLimit;

        } while (hasData);

        await Promise.all(messagePromises);
    }
}
