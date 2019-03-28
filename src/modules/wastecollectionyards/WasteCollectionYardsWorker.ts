"use strict";

import { CityDistricts, WasteCollectionYards } from "data-platform-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { Validator } from "../../core/helpers";
import { CustomError } from "../../core/helpers/errors";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { WasteCollectionYardsTransformation } from "./";

export class WasteCollectionYardsWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: WasteCollectionYardsTransformation;
    private model: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        const yardsDataType = new JSONDataTypeStrategy({resultsPath: "features"});
        yardsDataType.setFilter((item) => item.properties.PLATNOST !== 0);
        this.dataSource = new DataSource(WasteCollectionYards.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {},
                method: "GET",
                url: config.datasources.WasteCollectionYards,
            }),
            yardsDataType,
            new Validator(WasteCollectionYards.name + "DataSource",
                WasteCollectionYards.datasourceMongooseSchemaObject));

        this.model = new MongoModel(WasteCollectionYards.name + "Model", {
                identifierPath: "properties.id",
                modelIndexes: [{ geometry : "2dsphere" },
                    { "properties.name": "text", "properties.operator": "text", "properties.address": "text" },
                    { weights: { "properties.name": 5, "properties.address": 1, "properties.operator": 5 }}],
                mongoCollectionName: WasteCollectionYards.mongoCollectionName,
                outputMongooseSchemaObject: WasteCollectionYards.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.properties.name = b.properties.name;
                    a.properties.operator = b.properties.operator;
                    a.properties.type = b.properties.type;
                    a.properties.address = b.properties.address;
                    a.properties.contact = b.properties.contact;
                    a.properties.operating_hours = b.properties.operating_hours;
                    a.properties.properties = b.properties.properties;
                    a.properties.timestamp = b.properties.timestamp;
                    return a;
                },
            },
            new Validator(WasteCollectionYards.name + "ModelValidator",
                WasteCollectionYards.outputMongooseSchemaObject),
        );
        this.transformation = new WasteCollectionYardsTransformation();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + WasteCollectionYards.name.toLowerCase();
        this.cityDistrictsModel = new MongoModel(CityDistricts.name + "Model", {
                identifierPath: "properties.id",
                mongoCollectionName: CityDistricts.mongoCollectionName,
                outputMongooseSchemaObject: CityDistricts.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
            },
            new Validator(CityDistricts.name + "ModelValidator", CityDistricts.outputMongooseSchemaObject),
        );
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);

        // send messages for updating district and address and average occupancy
        const promises = transformedData.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateDistrict",
                new Buffer(JSON.stringify(p)));
        });
        await Promise.all(promises);
    }

    public updateDistrict = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const id = inputData.properties.id;
        const dbData = await this.model.findOneById(id);

        if (!dbData.properties.district
                || inputData.geometry.coordinates[0] !== dbData.geometry.coordinates[0]
                || inputData.geometry.coordinates[1] !== dbData.geometry.coordinates[1]) {
            try {
                const result = await this.cityDistrictsModel.findOne({ // find district by coordinates
                    geometry: {
                        $geoIntersects: {
                            $geometry: {
                                coordinates: dbData.geometry.coordinates,
                                type: "Point",
                            },
                        },
                    },
                });
                dbData.properties.district = (result) ? result.properties.slug : null;
                await dbData.save();
            } catch (err) {
                throw new CustomError("Error while updating district.", true, this.constructor.name, 1015, err);
            }
        }
        return dbData;
    }

}
