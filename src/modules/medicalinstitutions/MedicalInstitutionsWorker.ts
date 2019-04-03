"use strict";

import { CityDistricts, MedicalInstitutions } from "data-platform-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { GeocodeApi, Validator } from "../../core/helpers";
import { CustomError } from "../../core/helpers/errors";
import { MongoModel, RedisModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { MedicalInstitutionsTransformation } from "./";

export class MedicalInstitutionsWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: MedicalInstitutionsTransformation;
    private redisModel: RedisModel;
    private model: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        this.dataSource = new DataSource(MedicalInstitutions.name + "DataSource",
            new HTTPProtocolStrategy({
                encoding: null,
                headers : {},
                isCompressed: true,
                method: "GET",
                rejectUnauthorized: false,
                url: config.datasources.MedicalInstitutions,
                whitelistedFiles: [
                    "lekarny_prac_doba.csv", "lekarny_seznam.csv", "lekarny_typ.csv",
                ],
            }),
            new JSONDataTypeStrategy({resultsPath: ""}),
            new Validator(MedicalInstitutions.name + "DataSource",
                MedicalInstitutions.datasourceMongooseSchemaObject));
        this.redisModel = new RedisModel(MedicalInstitutions.name + "Model", {
                isKeyConstructedFromData: false,
                prefix: "",
            },
            null);
        this.model = new MongoModel(MedicalInstitutions.name + "Model", {
                identifierPath: "properties.id",
                modelIndexes: [{ geometry : "2dsphere" },
                    { "properties.name": "text", "properties.address": "text" },
                    { weights: { "properties.name": 5, "properties.address": 1 }}],
                mongoCollectionName: MedicalInstitutions.mongoCollectionName,
                outputMongooseSchemaObject: MedicalInstitutions.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.properties.address = b.properties.address;
                    a.properties.email = b.properties.email;
                    a.properties.name = b.properties.name;
                    a.properties.opening_hours = b.properties.opening_hours;
                    a.properties.pharmacy_code = b.properties.pharmacy_code;
                    a.properties.telephone = b.properties.telephone;
                    a.properties.type = b.properties.type;
                    a.properties.web = b.properties.web;
                    a.properties.timestamp = b.properties.timestamp;
                    return a;
                },
            },
            new Validator(MedicalInstitutions.name + "ModelValidator",
                MedicalInstitutions.outputMongooseSchemaObject),
        );
        this.transformation = new MedicalInstitutionsTransformation();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + MedicalInstitutions.name.toLowerCase();
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

        const inputData = data.map(async (d) => {
            d.data = await this.redisModel.getData(d.filepath);
            return d;
        });
        const transformedData = await this.transformation.transform(await Promise.all(inputData));
        await this.model.save(transformedData);

        // send messages for updating district and geo
        const promises = transformedData.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateGeoAndDistrict",
                new Buffer(JSON.stringify(p)));
        });
        await Promise.all(promises);
    }

    public updateGeoAndDistrict = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const id = inputData.properties.id;
        const dbData = await this.model.findOneById(id);

        if (dbData.geometry.coordinates[0] === 0 && dbData.geometry.coordinates[1] === 0) {
            try {
                const coordinates = await GeocodeApi.getGeoByAddress(dbData.properties.address.street.split(",")[0],
                    dbData.properties.address.city);
                dbData.geometry.coordinates = coordinates;
                await dbData.save();
            } catch (err) {
                throw new CustomError("Error while updating geo.", true, this.constructor.name, 1016, err);
            }
        }

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
                // TODO zjistit proc tady nefunguje `await dbData.save();` viz vyse
                await this.model.update(id, {$set: {"properties.district": (result) ? result.properties.slug : null}});
            } catch (err) {
                throw new CustomError("Error while updating district.", true, this.constructor.name, 1015, err);
            }
        }
    }

}
