"use strict";

import { CustomError } from "@golemio/errors";
import { SharedBikes } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { log } from "../../core/helpers";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { HomeportLocationsTransformation, HomeportOutOfLocationsTransformation, RekolaTransformation } from "./";

import cheapruler from "cheap-ruler";
const ruler = cheapruler(50);

export class SharedBikesWorker extends BaseWorker {

    private homeportLocationsDataSource: DataSource;
    private homeportOutOfLocationsDataSource: DataSource;
    private rekolaDataSource: DataSource;
    private homeportLocationsTransformation: HomeportLocationsTransformation;
    private homeportOutOfLocationsTransformation: HomeportOutOfLocationsTransformation;
    private rekolaTransformation: RekolaTransformation;
    private model: MongoModel;

    constructor() {
        super();

        this.homeportLocationsDataSource = new DataSource(SharedBikes.homeport.name + "LocDataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                strictSSL: false,
                url: config.datasources.HomeportLocationsSharedBikes,
            }),
            new JSONDataTypeStrategy({ resultsPath: "Locations" }),
            new Validator(SharedBikes.homeport.name + "LocDataSource",
                SharedBikes.homeport.datasourceLocationsMongooseSchemaObject));
        const homeportOutOfLocDataTypeStrategy = new JSONDataTypeStrategy({ resultsPath: "" });
        homeportOutOfLocDataTypeStrategy.setFilter((item) => item.AvailabilityCode === 1);
        this.homeportOutOfLocationsDataSource = new DataSource(SharedBikes.homeport.name + "OutOfLocDataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                strictSSL: false,
                url: config.datasources.HomeportOutOfLocationsSharedBikes,
            }),
            homeportOutOfLocDataTypeStrategy,
            new Validator(SharedBikes.homeport.name + "OutOfLocDataSource",
                SharedBikes.homeport.datasourceOutOfLocationsMongooseSchemaObject));
        this.rekolaDataSource = new DataSource(SharedBikes.rekola.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: config.datasources.RekolaSharedBikesHeaders,
                method: "GET",
                url: config.datasources.RekolaSharedBikes,
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(SharedBikes.rekola.name + "DataSource",
                SharedBikes.rekola.datasourceMongooseSchemaObject));
        this.homeportLocationsTransformation = new HomeportLocationsTransformation();
        this.homeportOutOfLocationsTransformation = new HomeportOutOfLocationsTransformation();
        this.rekolaTransformation = new RekolaTransformation();

        this.model = new MongoModel(SharedBikes.name + "Model", {
            identifierPath: "properties.id",
            mongoCollectionName: SharedBikes.mongoCollectionName,
            outputMongooseSchemaObject: SharedBikes.outputMongooseSchemaObject,
            resultsPath: "properties",
            savingType: "insertOrUpdate",
            searchPath: (id, multiple) => (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id },
            updateValues: (a, b) => {
                a.geometry.coordinates = b.geometry.coordinates;
                a.properties.company = b.properties.company;
                a.properties.in_rack = b.properties.in_rack;
                a.properties.label = b.properties.label;
                a.properties.location_note = b.properties.location_note;
                a.properties.name = b.properties.name;
                a.properties.res_url = b.properties.res_url;
                a.properties.type = b.properties.type;
                a.properties.estimated_trip_length_in_km = b.properties.estimated_trip_length_in_km;
                a.properties.updated_at = b.properties.updated_at;
                return a;
            },
        },
            new Validator(SharedBikes.name + "ModelValidator", SharedBikes.outputMongooseSchemaObject),
        );
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        let homeportLocations = [];
        let homeportOutOfLocations = [];
        let rekola = [];

        try {
            homeportLocations = await this.homeportLocationsTransformation
                .transform(await this.homeportLocationsDataSource.getAll());
        } catch (err) {
            log.warn((err instanceof CustomError) ? err.toString() : err);
        }

        try {
            homeportOutOfLocations = await this.homeportOutOfLocationsTransformation
                .transform(await this.homeportOutOfLocationsDataSource.getAll());
        } catch (err) {
            log.warn((err instanceof CustomError) ? err.toString() : err);
        }

        try {
            rekola = await this.rekolaTransformation
                .transform(await this.rekolaDataSource.getAll());
        } catch (err) {
            log.warn((err instanceof CustomError) ? err.toString() : err);
        }

        const concatenatedData = [
            ...homeportLocations,
            ...homeportOutOfLocations,
            ...rekola,
        ];

        // filter the objects 18 km far from the center of Prague
        const filteredData = concatenatedData.filter((item) => {
            // distance from center of Prague
            const distance = ruler.distance([14.463401734828949, 50.06081863605803], item.geometry.coordinates);
            return distance < 18;
        });
        await this.model.save(filteredData);
    }

}
