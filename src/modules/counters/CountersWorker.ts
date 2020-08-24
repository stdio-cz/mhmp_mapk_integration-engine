"use strict";

import { BicycleCounters, Counters } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as moment from "moment-timezone";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import {
    EcoCounterMeasurementsTransformation,
    EcoCounterTransformation,
} from "./";

export class CountersWorker extends BaseWorker {

    private dataSourceEcoCounter: DataSource;
    private dataSourceEcoCounterMeasurements: DataSource;

    private ecoCounterTransformation: EcoCounterTransformation;
    private ecoCounterMeasurementsTransformation: EcoCounterMeasurementsTransformation;

    private queuePrefix: string;

    private countersLocationsModel: PostgresModel;
    private countersDirectionsModel: PostgresModel;
    private countersDetectionsModel: PostgresModel;

    constructor() {
        super();

        const parser = new JSONDataTypeStrategy({ resultsPath: "" });
        parser.setFilter((item) => item.counter !== null);
        this.dataSourceEcoCounter = new DataSource(BicycleCounters.ecoCounter.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {
                    Authorization: `Bearer ${config.datasources.CountersEcoCounterTokens.OICT}`,
                },
                method: "GET",
                url: config.datasources.BicycleCountersEcoCounter,
            }),
            parser,
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

        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + "counters";
    }

    public refreshEcoCounterDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSourceEcoCounter.getAll();

        const transformedData = await this.ecoCounterTransformation.transform(data);

        await this.countersLocationsModel.save(transformedData.locationsPedestrians);
        await this.countersDirectionsModel.save(transformedData.directionsPedestrians);

        const promisesPeds = transformedData.directionsPedestrians.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateEcoCounter",
                JSON.stringify({
                    category: "pedestrian",
                    directions_id: p.id,
                    id: p.vendor_id,
                    locations_id: p.locations_id,
                }));
        });
        await Promise.all(promisesPeds);
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
        const strFrom = nowRounded.clone().subtract(72, "hours").format("YYYY-MM-DDTHH:mm:ss");

        let url = config.datasources.BicycleCountersEcoCounterMeasurements;
        url = url.replace(":id", id);
        url = url.replace(":from", strFrom);
        url = url.replace(":to", strTo);
        url = url.replace(":step", `${step}m`);
        url = url.replace(":complete", "true");

        this.dataSourceEcoCounterMeasurements.setProtocolStrategy(new HTTPProtocolStrategy({
            headers: {
                Authorization: `Bearer ${config.datasources.CountersEcoCounterTokens.OICT}`,
            },
            json: true,
            method: "GET",
            url,
        }));

        const data = await this.dataSourceEcoCounterMeasurements.getAll();

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
    }

}
