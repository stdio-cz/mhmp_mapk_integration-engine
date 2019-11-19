"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as moment from "moment-timezone";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import {
    BicycleCountersCameaMeasurementsTransformation, BicycleCountersCameaTransformation,
    BicycleCountersEcoCounterMeasurementsTransformation, BicycleCountersEcoCounterTransformation,
} from "./";

export class BicycleCountersWorker extends BaseWorker {

    private dataSourceCamea: DataSource;
    private dataSourceCameaMeasurements: DataSource;
    private dataSourceEcoCounter: DataSource;
    private dataSourceEcoCounterMeasurements: DataSource;
    private cameaTransformation: BicycleCountersCameaTransformation;
    private ecoCounterTransformation: BicycleCountersEcoCounterTransformation;
    private cameaMeasurementsTransformation: BicycleCountersCameaMeasurementsTransformation;
    private ecoCounterMeasurementsTransformation: BicycleCountersEcoCounterMeasurementsTransformation;
    private model: MongoModel;
    private measurementsModel: MongoModel;
    private queuePrefix: string;

    constructor() {
        super();
        //#region Camea

        this.dataSourceCamea = new DataSource(BicycleCounters.name + "CameaDataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.BicycleCountersCamea,
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(BicycleCounters.name + "CameaDataSource",
                BicycleCounters.datasourceCameaMongooseSchemaObject));
        this.dataSourceCameaMeasurements = new DataSource(BicycleCounters.measurements.name + "CameaDataSource",
            undefined,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(BicycleCounters.measurements.name + "CameaDataSource",
                BicycleCounters.measurements.datasourceCameaMongooseSchemaObject));

        this.cameaTransformation = new BicycleCountersCameaTransformation();
        this.cameaMeasurementsTransformation = new BicycleCountersCameaMeasurementsTransformation();

        //#endregion

        //#region Eco Counter

        this.dataSourceEcoCounter = new DataSource(BicycleCounters.name + "EcoCounterDataSource",
            new HTTPProtocolStrategy({
                headers: {
                    Authorization: `Bearer ${config.datasources.BicycleCountersEcoCounterToken}`,
                },
                method: "GET",
                url: config.datasources.BicycleCountersEcoCounter,
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(BicycleCounters.name + "EcoCounterDataSource",
                BicycleCounters.datasourceEcoCounterMongooseSchemaObject));
        this.dataSourceEcoCounterMeasurements = new DataSource(BicycleCounters.measurements.name +
            "EcoCounterDataSource",
            undefined,
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(BicycleCounters.measurements.name + "EcoCounterDataSource",
                BicycleCounters.measurements.datasourceEcoCounterMongooseSchemaObject));

        this.ecoCounterTransformation = new BicycleCountersEcoCounterTransformation();
        this.ecoCounterMeasurementsTransformation = new BicycleCountersEcoCounterMeasurementsTransformation();

        //#endregion

        //#region mongo models

        this.model = new MongoModel(BicycleCounters.name + "Model", {
            identifierPath: "properties.id",
            mongoCollectionName: BicycleCounters.mongoCollectionName,
            outputMongooseSchemaObject: BicycleCounters.outputMongooseSchemaObject,
            resultsPath: "properties",
            savingType: "insertOrUpdate",
            searchPath: (id, multiple) => (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id },
            updateValues: (a, b) => {
                a.properties.directions = b.properties.directions;
                a.properties.name = b.properties.name;
                a.properties.route = b.properties.route;
                a.properties.updated_at = b.properties.updated_at;
                return a;
            },
        },
            new Validator(BicycleCounters.name + "ModelValidator", BicycleCounters.outputMongooseSchemaObject),
        );

        this.measurementsModel = new MongoModel(BicycleCounters.measurements.name + "Model", {
            identifierPath: "_id",
            mongoCollectionName: BicycleCounters.measurements.mongoCollectionName,
            outputMongooseSchemaObject: BicycleCounters.measurements.outputMongooseSchemaObject,
            savingType: "insertOrUpdate",
            searchPath: (id, multiple) => (multiple)
                ? { _id: { $in: id } }
                : { _id: id },
            updateValues: (a, b) => {
                if (b.directions) {
                    if (!a.directions) {
                        a.directions = [];
                    }
                    b.directions.forEach((bd) => {
                        const found = a.directions.find((ad) => ad.id === bd.id);
                        if (!found) {
                            a.directions.push(bd);
                        }
                    });
                }

                // a.measured_to = b.measured_to;
                // a.measured_from = b.measured_from;
                if (!a.temperature) {
                    a.temperature = b.temperature;
                }
                a.updated_at = b.updated_at;
                return a;
            },
        },
            new Validator(BicycleCounters.measurements.name + "ModelValidator",
                BicycleCounters.measurements.outputMongooseSchemaObject),
        );

        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + BicycleCounters.name.toLowerCase();

        //#endregion
    }

    //#region Camea

    public refreshCameaDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSourceCamea.getAll();
        const transformedData = await this.cameaTransformation.transform(data);
        await this.model.save(transformedData);

        // send messages for updating measurements data
        const promises = transformedData.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateCamea",
                new Buffer(JSON.stringify({ id: p.properties.id })));
        });
        await Promise.all(promises);
    }

    public updateCamea = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const id = inputData.id;
        const externId = id.replace("camea-", "");

        const now = moment.utc();
        const step = 5;
        const remainder = step - (now.minute() % step);
        // rounded to nearest next 5 minutes
        const nowRounded = now.clone().add(remainder, "minutes").seconds(0).milliseconds(0);
        const nowMinus12h = nowRounded.clone().subtract(12, "hours");
        const strNow = nowRounded.format("YYYY-MM-DD HH:mm:ss");
        const strNowMinus12h = nowMinus12h.format("YYYY-MM-DD HH:mm:ss");

        let url = config.datasources.BicycleCountersCameaMeasurements;
        url = url.replace(":id", externId);
        url = url.replace(":from", strNowMinus12h);
        url = url.replace(":to", strNow);

        this.dataSourceCameaMeasurements.setProtocolStrategy(new HTTPProtocolStrategy({
            headers: {},
            json: true,
            method: "GET",
            url,
        }));

        const data = await this.dataSourceCameaMeasurements.getAll();
        let transformedData = await this.cameaMeasurementsTransformation.transform(data);

        // add property counter_id to each item
        // insert only those that have at least 1 direction with value
        transformedData = transformedData
            .map((x) => {
                x.counter_id = id;
                return {
                    ...x,
                    directions: x.directions ? x.directions.filter((d) => d.value != null) : [],
                };
            })
            .filter((x) => x.directions && x.directions.length > 0);

        const measuredAtArray = transformedData.map((x) => x.measured_to);

        // check the existing measurements in the database
        const found = await this.measurementsModel.find({
            counter_id: id,
            measured_to: { $in: measuredAtArray },
        });

        // for Camea the record could already exist because it could have only 1 direction saved
        // (2nd was without value)
        const newOrModifiedMeasures = [];
        transformedData.forEach((x) => {
            const dbData = found.find((db) => db.measured_to === x.measured_to);
            if (!dbData) {
                newOrModifiedMeasures.push(x);
            } else {
                let alreadyAdded = false;
                x.directions.forEach((d) => {
                    if (!alreadyAdded) {
                        const dbDirection = this.findDirectionById(dbData, d.id);
                        if (!dbDirection) {
                            // if the direction is not found in the DB, we have to update it
                            // (via measurementsModel.updateValues function)
                            newOrModifiedMeasures.push({ ...x, _id: dbData.id });
                            alreadyAdded = true;
                        }
                    }
                });
            }
        });

        // insert only new or modified measures
        await this.measurementsModel.save(newOrModifiedMeasures);
    }

    //#endregion

    //#region Eco Counter

    public refreshEcoCounterDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSourceEcoCounter.getAll();
        const transformedData = await this.ecoCounterTransformation.transform(data);
        await this.model.save(transformedData);

        // send messages for updating measurements data
        const promises = [];
        transformedData.forEach((p) => {
            if (p.properties.directions) {
                const directionPromisses = p.properties.directions.map((ch) =>
                    this.sendMessageToExchange("workers." + this.queuePrefix + ".updateEcoCounter",
                        new Buffer(JSON.stringify({ id: p.properties.id, direction_id: ch.id }))),
                );
                promises.push(...directionPromisses);
            }

        });
        await Promise.all(promises);
    }

    public updateEcoCounter = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const id = inputData.id;
        const directionId = inputData.direction_id.toString();

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
        url = url.replace(":id", directionId);
        url = url.replace(":from", strFrom);
        url = url.replace(":to", strTo);
        url = url.replace(":step", `${step}m`);
        url = url.replace(":complete", "true");

        this.dataSourceEcoCounterMeasurements.setProtocolStrategy(new HTTPProtocolStrategy({
            headers: {
                Authorization: `Bearer ${config.datasources.BicycleCountersEcoCounterToken}`,
            },
            json: true,
            method: "GET",
            url,
        }));

        const data = await this.dataSourceEcoCounterMeasurements.getAll();
        let transformedData = await this.ecoCounterMeasurementsTransformation.transform(data);

        // insert only those that have at least 1 direction with value
        transformedData = transformedData
            .map((x) => {
                x.counter_id = id;
                x.directions.forEach((d) => {
                    d.id = directionId;
                });
                return {
                    ...x,
                    directions: x.directions ? x.directions.filter((d) => d.value != null) : [],
                };
            })
            .filter((x) => x.directions && x.directions.length > 0);

        const measuredAtArray = transformedData.map((x) => x.measured_to);

        // check the existing measurements in the database
        const found = await this.measurementsModel.find({
            counter_id: id,
            measured_to: { $in: measuredAtArray },
        });

        // for EcoCounter the record could already exist because they are fetched individually
        // (for each direction separated request is performed)
        const newOrModifiedMeasures = [];
        transformedData.forEach((x) => {
            const dbData = found.find((db) => db.measured_to === x.measured_to);
            if (!dbData) {
                newOrModifiedMeasures.push(x);
            } else {
                const dbDirection = this.findDirectionById(dbData, directionId);
                if (!dbDirection) {
                    // if the direction is not found in the DB, we have to update it
                    // (via measurementsModel.updateValues function)
                    newOrModifiedMeasures.push({ ...x, _id: dbData._id });
                }
            }
        });

        await this.measurementsModel.save(newOrModifiedMeasures);
    }

    private findDirectionById = (element: any, id: string) => {
        if (element.directions) {
            return element.directions.find((x) => x.id === id);
        }
        return null;
    }

    //#endregion
}
