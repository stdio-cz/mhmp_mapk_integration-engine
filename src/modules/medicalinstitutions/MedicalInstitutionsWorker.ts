"use strict";

import { CustomError } from "@golemio/errors";
import { CityDistricts, MedicalInstitutions } from "golemio-schema-definitions";
import { Validator } from "golemio-validator";
import { config } from "../../core/config";
import { CSVDataTypeStrategy, DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { GeocodeApi } from "../../core/helpers";
import { MongoModel, RedisModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { HealthCareTransformation, PharmaciesTransformation } from "./";

export class MedicalInstitutionsWorker extends BaseWorker {

    private pharmaciesDatasource: DataSource;
    private healthCareDatasource: DataSource;
    private pharmaciesTransformation: PharmaciesTransformation;
    private healthCareTransformation: HealthCareTransformation;
    private redisModel: RedisModel;
    private model: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        this.pharmaciesDatasource = new DataSource(MedicalInstitutions.pharmacies.name + "DataSource",
            new HTTPProtocolStrategy({
                encoding: null,
                headers: {},
                isCompressed: true,
                method: "GET",
                rejectUnauthorized: false,
                url: config.datasources.MedicalInstitutionsPharmacies,
                whitelistedFiles: [
                    "lekarny_prac_doba.csv", "lekarny_seznam.csv", "lekarny_typ.csv",
                ],
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(MedicalInstitutions.pharmacies.name + "DataSource",
                MedicalInstitutions.pharmacies.datasourceMongooseSchemaObject));
        const hcDataTypeStrategy = new CSVDataTypeStrategy({
            csvtojsonParams: { noheader: false },
            subscribe: ((json: any) => {
                delete json.poskytovatel_ič;
                delete json.poskytovatel_právní_forma_osoba;
                delete json.poskytovatel_právní_forma;
                delete json.sídlo_adresa_kód_kraje;
                delete json.sídlo_adresa_název_kraje;
                delete json.sídlo_adresa_kód_okresu;
                delete json.sídlo_adresa_název_okresu;
                delete json.sídlo_adresa_psč;
                delete json.sídlo_adresa_název_obce;
                delete json.sídlo_adresa_název_ulice;
                delete json.sídlo_adresa_číslo_domovní;
                return json;
            }),
        });
        hcDataTypeStrategy.setFilter((item) => {
            return item.adresa_kód_kraje === "CZ010"
                && ["Fakultní nemocnice", "Nemocnice", "Nemocnice následné péče", "Ostatní ambulantní zařízení",
                    "Ostatní zdravotnická zařízení", "Ostatní zvláštní zdravotnická zařízení",
                    "Výdejna zdravotnických prostředků", "Záchytná stanice", "Zdravotní záchranná služba",
                    "Zdravotnické středisko"].indexOf(item.typ) !== -1;
        });
        this.healthCareDatasource = new DataSource(MedicalInstitutions.healthCare.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.MedicalInstitutionsHealthCare,
            }),
            hcDataTypeStrategy,
            new Validator(MedicalInstitutions.healthCare.name + "DataSource",
                MedicalInstitutions.healthCare.datasourceMongooseSchemaObject));
        this.redisModel = new RedisModel(MedicalInstitutions.name + "Model", {
            isKeyConstructedFromData: false,
            prefix: "files",
        },
            null);
        this.model = new MongoModel(MedicalInstitutions.name + "Model", {
            identifierPath: "properties.id",
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
                a.properties.updated_at = b.properties.updated_at;
                return a;
            },
        },
            new Validator(MedicalInstitutions.name + "ModelValidator",
                MedicalInstitutions.outputMongooseSchemaObject),
        );
        this.healthCareTransformation = new HealthCareTransformation();
        this.pharmaciesTransformation = new PharmaciesTransformation();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + MedicalInstitutions.name.toLowerCase();
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
        const data = await Promise.all([
            this.pharmaciesDatasource.getAll(),
            this.healthCareDatasource.getAll(),
        ]);

        const inputData = data[0].map(async (d) => {
            d.data = await this.redisModel.getData(d.filepath);
            return d;
        });

        let transformedData = await Promise.all([
            this.pharmaciesTransformation.transform(await Promise.all(inputData)),
            this.healthCareTransformation.transform(data[1]),
        ]);
        transformedData = transformedData[0].concat(transformedData[1]);
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
                const coordinates = await GeocodeApi.getGeoByAddress(dbData.properties.address.street_address,
                    dbData.properties.address.address_locality);
                dbData.geometry.coordinates = coordinates;
                await dbData.save();
            } catch (err) {
                throw new CustomError("Error while updating geo.", true, this.constructor.name, 5001, err);
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
                await this.model.updateOneById(id,
                    { $set: { "properties.district": (result) ? result.properties.slug : null } });
            } catch (err) {
                throw new CustomError("Error while updating district.", true, this.constructor.name, 5001, err);
            }
        }
    }

}
