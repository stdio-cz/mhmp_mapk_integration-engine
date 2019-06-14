"use strict";

import { ParkingZones } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { Validator } from "../../core/helpers";
import { CustomError } from "../../core/helpers/errors";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { ParkingZonesTransformation } from "./";

export class ParkingZonesWorker extends BaseWorker {

    private dataSource: DataSource;
    private dataSourceTariffs: DataSource;
    private transformation: ParkingZonesTransformation;
    private model: MongoModel;
    private queuePrefix: string;

    constructor() {
        super();
        const zonesDataType = new JSONDataTypeStrategy({resultsPath: "features"});
        zonesDataType.setFilter((item) => item.properties.TARIFTAB);
        this.dataSource = new DataSource(ParkingZones.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {},
                method: "GET",
                url: config.datasources.ParkingZones,
            }),
            zonesDataType,
            new Validator(ParkingZones.name + "DataSource", ParkingZones.datasourceMongooseSchemaObject));
        this.dataSourceTariffs = new DataSource("ParkingZonesTariffsDataSource",
            undefined,
            new JSONDataTypeStrategy({resultsPath: "dailyTariff"}),
            new Validator("ParkingZonesTariffsDataSource", ParkingZones.datasourceTariffsMongooseSchemaObject));
        this.model = new MongoModel(ParkingZones.name + "Model", {
                identifierPath: "properties.id",
                mongoCollectionName: ParkingZones.mongoCollectionName,
                outputMongooseSchemaObject: ParkingZones.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.properties.name = b.properties.name;
                    a.properties.number_of_places = b.properties.number_of_places;
                    a.properties.payment_link = b.properties.payment_link;
                    a.properties.tariffs = b.properties.tariffs;
                    a.properties.updated_at = b.properties.updated_at;
                    a.properties.type = b.properties.type;
                    a.properties.midpoint = b.properties.midpoint;
                    a.properties.northeast = b.properties.northeast;
                    a.properties.southwest = b.properties.southwest;
                    a.properties.zps_id = b.properties.zps_id;
                    a.properties.zps_ids = b.properties.zps_ids;
                    return a;
                },
            },
            new Validator(ParkingZones.name + "ModelValidator", ParkingZones.outputMongooseSchemaObject),
        );
        this.transformation = new ParkingZonesTransformation();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + ParkingZones.name.toLowerCase();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);

        // send messages for updating tariffs
        const promises = transformedData.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateTariffs",
                new Buffer(JSON.stringify(p.properties.id)));
        });
        await Promise.all(promises);
}

    public updateTariffs = async (msg: any): Promise<void> => {
        const id = JSON.parse(msg.content.toString());

        this.dataSourceTariffs.setProtocolStrategy(new HTTPProtocolStrategy({
                headers : {
                    authorization: config.datasources.ParkingZonesTariffsAuth,
                },
                json: true,
                method: "GET",
                url: config.datasources.ParkingZonesTariffs + id,
            }));

        try {
            const data = await this.dataSourceTariffs.getAll();
            const transformedData = await this.transformation.transformTariffs(id, data);

            await this.model.updateOneById(id, {
                $set: {
                    "properties.tariffs": transformedData.tariffs,
                    "properties.tariffs_text": transformedData.tariffsText,
                },
            });
        } catch (err) {
            throw new CustomError("Error while updating parking zone tariffs.", true, this.constructor.name, 1027, err);
        }
    }

}
