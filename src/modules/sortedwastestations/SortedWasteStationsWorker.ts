"use strict";

import { CityDistricts, SortedWasteStations } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { log, Validator } from "../../core/helpers";
import { CustomError } from "../../core/helpers/errors";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import {
    IPRSortedWasteStationsTransformation,
    OICTSortedWasteStationsTransformation,
    POTEXSortedWasteStationsTransformation } from "./";

const _ = require("underscore");

export class SortedWasteStationsWorker extends BaseWorker {

    private iprContainersDatasource: DataSource;
    private iprStationsDatasource: DataSource;
    private oictDatasource: DataSource;
    private potexDatasource: DataSource;
    private iprTransformation: IPRSortedWasteStationsTransformation;
    private oictTransformation: OICTSortedWasteStationsTransformation;
    private potexTransformation: POTEXSortedWasteStationsTransformation;
    private model: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        this.iprContainersDatasource = new DataSource(SortedWasteStations.ipr.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {},
                    method: "GET",
                    url: config.datasources.IPRSortedWasteContainers,
                }),
                new JSONDataTypeStrategy({resultsPath: "features"}),
                new Validator(SortedWasteStations.ipr.name + "ContainersDataSource",
                    SortedWasteStations.ipr.datasourceContainersMongooseSchemaObject));
        this.iprStationsDatasource = new DataSource(SortedWasteStations.ipr.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {},
                method: "GET",
                url: config.datasources.IPRSortedWasteStations,
            }),
            new JSONDataTypeStrategy({resultsPath: "features"}),
            new Validator(SortedWasteStations.ipr.name + "StationsDataSource",
                SortedWasteStations.ipr.datasourceStationsMongooseSchemaObject));
        this.oictDatasource = new DataSource(SortedWasteStations.oict.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {
                    Authorization: "Basic " + config.MOJEPRAHA_ENDPOINT_APIKEY,
                },
                method: "GET",
                url: config.datasources.OICTSortedWasteContainers,
            }),
            new JSONDataTypeStrategy({resultsPath: ""}),
            new Validator(SortedWasteStations.oict.name + "DataSource",
                SortedWasteStations.oict.datasourceMongooseSchemaObject));
        this.potexDatasource = new DataSource(SortedWasteStations.potex.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {},
                method: "GET",
                url: config.datasources.POTEXSortedWasteContainers,
            }),
            new JSONDataTypeStrategy({resultsPath: "places"}),
            new Validator(SortedWasteStations.potex.name + "DataSource",
                SortedWasteStations.potex.datasourceMongooseSchemaObject));

        this.model = new MongoModel(SortedWasteStations.name + "Model", {
                identifierPath: "properties.id",
                modelIndexes: [{ geometry : "2dsphere" },
                    { "properties.name": "text" }, { weights: { "properties.name": 5 }}],
                mongoCollectionName: SortedWasteStations.mongoCollectionName,
                outputMongooseSchemaObject: SortedWasteStations.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.properties.accessibility = b.properties.accessibility;
                    a.properties.containers = b.properties.containers;
                    a.properties.district = (b.properties.district) ? b.properties.district : null;
                    a.properties.name = b.properties.name;
                    a.properties.station_number = b.properties.station_number;
                    a.properties.timestamp = b.properties.timestamp;
                    return a;
                },
            },
            new Validator(SortedWasteStations.name + "ModelValidator",
                SortedWasteStations.outputMongooseSchemaObject),
        );
        this.iprTransformation = new IPRSortedWasteStationsTransformation();
        this.oictTransformation = new OICTSortedWasteStationsTransformation();
        this.potexTransformation = new POTEXSortedWasteStationsTransformation();

        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + SortedWasteStations.name.toLowerCase();
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
        const data = await Promise.all([
            this.iprContainersDatasource.getAll(),
            this.iprStationsDatasource.getAll(),
            this.oictDatasource.getAll(),
            this.potexDatasource.getAll(),
        ]);

        this.iprTransformation.setContainers(data[0]);
        const transformedData = await Promise.all([
            this.iprTransformation.transform(data[1]),
            this.oictTransformation.transform(data[2]),
            this.potexTransformation.transform(data[3]),
        ]);

        const [merged, remainingStations] = await this.mergeContainersIntoStations(transformedData);
        const sortedStations = _.sortBy(merged, (a) => a.properties.id);
        let lastId = sortedStations[sortedStations.length - 1].properties.id;
        const remaining = remainingStations.map(async (station) => {
            station.properties.station_number = station.properties.id;
            station.properties.id = ++lastId;
            return station;
        });

        const results = merged.concat(await Promise.all(remaining));
        await this.model.save(results);

        // send messages for updating district and address and average occupancy
        const promises = results.map((p) => {
            if (!p.properties.district) {
                this.sendMessageToExchange("workers." + this.queuePrefix + ".updateDistrict",
                    new Buffer(JSON.stringify(p)));
            }
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
                if (!dbData.properties.district) {
                    await dbData.remove();
                    log.debug("District was not found. Object '" + dbData.properties.id + "' removed.");
                }
            } catch (err) {
                throw new CustomError("Error while updating district.", true, this.constructor.name, 1015, err);
            }
        }
        return dbData;
    }

    private mergeContainersIntoStations = async (transformedData: any[]): Promise<any> => {
        return new Promise((resolve, reject) => {
            const stations = transformedData[0]; // IPR dataset
            const containers = transformedData[1].concat(transformedData[2]);

            // JS Closure
            const stationsIterator = (i, icb) => {
                if (stations.length === i) {
                    return icb();
                }

                containersIterator(i, 0, () => {
                    setImmediate(stationsIterator.bind(null, i + 1, icb));
                });
            };

            // JS Closure
            const containersIterator = (i, j, jcb) => {
                if (containers.length === j) {
                    return jcb();
                }
                if (stations[i].properties.accessibility.id === 1
                        && this.calculateDistanceBetweenPoints(
                            stations[i].geometry.coordinates, containers[j].geometry.coordinates) <= 30) {
                    stations[i].properties.containers.concat(containers[j].properties.containers);
                    containers.splice(j, 1);
                    return jcb();
                }
                setImmediate(containersIterator.bind(null, i, j + 1, jcb));
            };

            stationsIterator(0, () => {
                resolve([stations, containers]);
            });
        });
    }

    private calculateDistanceBetweenPoints = (coord1, coord2) => {
        const [lng1, lat1] = coord1;
        const [lng2, lat2] = coord2;

        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1); // deg2rad below
        const dLng = this.deg2rad(lng2 - lng1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2)
          ;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c * 1000; // Distance in m
        return d;
    }

    private deg2rad = (deg) => {
        return deg * (Math.PI / 180);
    }
}
