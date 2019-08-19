"use strict";

import { CustomError } from "@golemio/errors";
import { CityDistricts, MunicipalPoliceStations } from "golemio-schema-definitions";
import { Validator } from "golemio-validator";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { GeocodeApi } from "../../core/helpers";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { MunicipalPoliceStationsTransformation } from "./";

export class MunicipalPoliceStationsWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: MunicipalPoliceStationsTransformation;
    private model: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        this.dataSource = new DataSource(MunicipalPoliceStations.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.MunicipalPoliceStations,
            }),
            new JSONDataTypeStrategy({ resultsPath: "features" }),
            new Validator(MunicipalPoliceStations.name + "DataSource",
                MunicipalPoliceStations.datasourceMongooseSchemaObject));

        this.model = new MongoModel(MunicipalPoliceStations.name + "Model", {
            identifierPath: "properties.id",
            mongoCollectionName: MunicipalPoliceStations.mongoCollectionName,
            outputMongooseSchemaObject: MunicipalPoliceStations.outputMongooseSchemaObject,
            resultsPath: "properties",
            savingType: "insertOrUpdate",
            searchPath: (id, multiple) => (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id },
            updateValues: (a, b) => {
                a.properties.cadastral_area = b.properties.cadastral_area;
                a.properties.note = b.properties.note;
                a.properties.updated_at = b.properties.updated_at;
                return a;
            },
        },
            new Validator(MunicipalPoliceStations.name + "ModelValidator",
                MunicipalPoliceStations.outputMongooseSchemaObject),
        );
        this.transformation = new MunicipalPoliceStationsTransformation();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + MunicipalPoliceStations.name.toLowerCase();
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
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);

        // send messages for updating district and address
        const promises = transformedData.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateAddressAndDistrict",
                new Buffer(JSON.stringify(p)));
        });
        await Promise.all(promises);
    }

    public updateAddressAndDistrict = async (msg: any): Promise<void> => {
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
                throw new CustomError("Error while updating district.", true, this.constructor.name, 5001, err);
            }
        }

        if (!dbData.properties.address || !dbData.properties.address.address_formatted
            || inputData.geometry.coordinates[0] !== dbData.geometry.coordinates[0]
            || inputData.geometry.coordinates[1] !== dbData.geometry.coordinates[1]) {
            try {
                const address = await GeocodeApi.getAddressByLatLng(dbData.geometry.coordinates[1],
                    dbData.geometry.coordinates[0]);
                dbData.properties.address = address;
                await dbData.save();
            } catch (err) {
                throw new CustomError("Error while updating adress.", true, this.constructor.name, 5001, err);
            }
        }
        return dbData;
    }

}
