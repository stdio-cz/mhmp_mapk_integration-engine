"use strict";

import { CustomError } from "@golemio/errors";
import { CityDistricts, MedicalInstitutions } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { CSVDataTypeStrategy, DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { GeocodeApi, log } from "../../core/helpers";
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
            fastcsvParams: { headers: true },
            subscribe: ((json: any) => {
                delete json.CisloDomovniOrientacniSidlo;
                delete json.DruhPece;
                delete json.FormaPece;
                delete json.Ico;
                delete json.Kod;
                delete json.Kraj;
                delete json.KrajCodeSidlo;
                delete json.MistoPoskytovaniId;
                delete json.ObecSidlo;
                delete json.OborPece;
                delete json.OdbornyZastupce;
                delete json.Okres;
                delete json.OkresCode;
                delete json.OkresCodeSidlo;
                delete json.PoskytovatelFax;
                delete json.PravniFormaKod;
                delete json.PscSidlo;
                delete json.SpravniObvod;
                delete json.TypOsoby;
                delete json.UliceSidlo;
                return json;
            }),
        });
        hcDataTypeStrategy.setFilter((item) => {
            return item.KrajCode === "CZ010"
                && item.Lat
                && item.Lng
                && ["Fakultní nemocnice", "Nemocnice", "Nemocnice následné péče", "Ostatní ambulantní zařízení",
                    "Ostatní zdravotnická zařízení", "Ostatní zvláštní zdravotnická zařízení",
                    "Výdejna zdravotnických prostředků", "Záchytná stanice", "Zdravotní záchranná služba",
                    "Zdravotnické středisko"].indexOf(item.DruhZarizeni) !== -1;
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
        let pharmacies = [];
        let healthCare = [];

        try {
            const pharmaciesData = await this.pharmaciesDatasource.getAll();
            const inputData = pharmaciesData.map(async (d) => {
                d.data = await this.redisModel.getData(d.filepath);
                return d;
            });
            pharmacies = await this.pharmaciesTransformation
                .transform(await Promise.all(inputData));
        } catch (err) {
            log.warn((err instanceof CustomError) ? err.toString() : err);
        }

        try {
            healthCare = await this.healthCareTransformation
                .transform(await this.healthCareDatasource.getAll());
        } catch (err) {
            log.warn((err instanceof CustomError) ? err.toString() : err);
        }

        const concatenatedData = [
            ...pharmacies,
            ...healthCare,
        ];

        await this.model.save(concatenatedData);

        // send messages for updating district and geo
        const promises = concatenatedData.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateGeoAndDistrict",
                JSON.stringify(p));
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
                await dbData.remove();
                log.debug("Address by geo was not found. Object '" + dbData.properties.id + "' removed.");
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
