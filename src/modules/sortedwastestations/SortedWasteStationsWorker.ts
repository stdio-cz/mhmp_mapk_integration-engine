"use strict";

import { CityDistricts, SortedWasteStations } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, IHTTPSettings, JSONDataTypeStrategy } from "../../core/datasources";
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
    private sensorsContainersDatasource: DataSource;
    private sensorsMeasurementsHTTPSettings: IHTTPSettings;
    private sensorsMeasurementsDatasource: DataSource;
    private sensorsPicksHTTPSettings: IHTTPSettings;
    private sensorsPicksDatasource: DataSource;
    private sensorsMeasurementsModel: MongoModel;
    private sensorsPicksModel: MongoModel;

    constructor() {
        super();
        this.iprContainersDatasource = new DataSource(SortedWasteStations.ipr.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.IPRSortedWasteContainers,
            }),
            new JSONDataTypeStrategy({ resultsPath: "features" }),
            new Validator(SortedWasteStations.ipr.name + "ContainersDataSource",
                SortedWasteStations.ipr.datasourceContainersMongooseSchemaObject));
        this.iprStationsDatasource = new DataSource(SortedWasteStations.ipr.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.IPRSortedWasteStations,
            }),
            new JSONDataTypeStrategy({resultsPath: "features"}),
            new Validator(SortedWasteStations.ipr.name + "StationsDataSource",
                SortedWasteStations.ipr.datasourceStationsMongooseSchemaObject));
        this.oictDatasource = new DataSource(SortedWasteStations.oict.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {
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
                headers: {},
                method: "GET",
                url: config.datasources.POTEXSortedWasteContainers,
            }),
            new JSONDataTypeStrategy({resultsPath: "places"}),
            new Validator(SortedWasteStations.potex.name + "DataSource",
                SortedWasteStations.potex.datasourceMongooseSchemaObject));

        this.model = new MongoModel(SortedWasteStations.name + "Model", {
                identifierPath: "properties.id",
                modelIndexes: [{ geometry: "2dsphere" }],
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
                    a.properties.updated_at = b.properties.updated_at;
                    return a;
                },
            },
            new Validator(SortedWasteStations.name + "ModelValidator",
                SortedWasteStations.outputMongooseSchemaObject),
        );
        this.iprTransformation = new IPRSortedWasteStationsTransformation();
        this.oictTransformation = new OICTSortedWasteStationsTransformation();
        this.potexTransformation = new POTEXSortedWasteStationsTransformation();

        this.sensorsContainersDatasource = new DataSource(SortedWasteStations.sensorsContainers.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : { "x-api-key": config.datasources.SensoneoSortedWasteSensorsApiKey },
                method: "GET",
                url: config.datasources.SensoneoSortedWasteSensors + "/container",
            }),
            new JSONDataTypeStrategy({resultsPath: "containers"}),
            new Validator(SortedWasteStations.sensorsContainers.name + "DataSource",
                SortedWasteStations.sensorsContainers.datasourceMongooseSchemaObject));

        this.sensorsMeasurementsHTTPSettings = {
            body: JSON.stringify({ }), // Warning! Data must contains `from` and `to` attributes
            headers: {
                "Content-Type": "application/json",
                "x-api-key": config.datasources.SensoneoSortedWasteSensorsApiKey,
            },
            method: "POST",
            url: config.datasources.SensoneoSortedWasteSensors + "/measurement",
        };
        this.sensorsMeasurementsDatasource = new DataSource(SortedWasteStations.sensorsMeasurements.name + "DataSource",
            new HTTPProtocolStrategy(this.sensorsMeasurementsHTTPSettings),
            new JSONDataTypeStrategy({resultsPath: "measurements"}),
            new Validator(SortedWasteStations.sensorsMeasurements.name + "DataSource",
                SortedWasteStations.sensorsMeasurements.datasourceMongooseSchemaObject));
        this.sensorsMeasurementsModel = new MongoModel(SortedWasteStations.sensorsMeasurements.name + "Model", {
                    identifierPath: "id",
                    mongoCollectionName: SortedWasteStations.sensorsMeasurements.mongoCollectionName,
                    outputMongooseSchemaObject: SortedWasteStations.sensorsMeasurements.outputMongooseSchemaObject,
                    resultsPath: "",
                    savingType: "insertOrUpdate",
                    searchPath: (id, multiple) => (multiple)
                        ? { id: { $in: id } }
                        : { id },
                    updateValues: (a, b) => {
                        a.battery_status = b.battery_status;
                        a.code = b.code;
                        a.container_id = b.container_id;
                        a.firealarm = b.firealarm;
                        a.measured_at_utc = b.measured_at_utc;
                        a.percent_calculated = b.percent_calculated;
                        a.prediction_utc = b.prediction_utc;
                        a.temperature = b.temperature;
                        a.upturned = b.upturned;
                        return a;
                    },
                },
                new Validator(SortedWasteStations.sensorsMeasurements.name + "ModelValidator",
                    SortedWasteStations.sensorsMeasurements.outputMongooseSchemaObject),
            );

        this.sensorsPicksHTTPSettings = {
            body: JSON.stringify({ }), // Warning! Data must contains `from` and `to` attributes
            headers: {
                "Content-Type": "application/json",
                "x-api-key": config.datasources.SensoneoSortedWasteSensorsApiKey,
            },
            method: "POST",
            url: config.datasources.SensoneoSortedWasteSensors + "/picks",
        };
        this.sensorsPicksDatasource = new DataSource(SortedWasteStations.sensorsPicks.name + "DataSource",
                new HTTPProtocolStrategy(this.sensorsPicksHTTPSettings),
                new JSONDataTypeStrategy({resultsPath: "picks"}),
                new Validator(SortedWasteStations.sensorsPicks.name + "DataSource",
                    SortedWasteStations.sensorsPicks.datasourceMongooseSchemaObject));
        this.sensorsPicksModel = new MongoModel(SortedWasteStations.sensorsPicks.name + "Model", {
                identifierPath: "id",
                mongoCollectionName: SortedWasteStations.sensorsPicks.mongoCollectionName,
                outputMongooseSchemaObject: SortedWasteStations.sensorsPicks.outputMongooseSchemaObject,
                resultsPath: "",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { id: { $in: id } }
                    : { id },
                updateValues: (a, b) => {
                    a.code = b.code;
                    a.container_id = b.container_id;
                    a.decrease = b.decrease;
                    a.event_driven = b.event_driven;
                    a.percent_before = b.percent_before;
                    a.percent_now = b.percent_now;
                    a.pick_at_utc = b.pick_at_utc;
                    a.pick_minfilllevel = b.pick_minfilllevel;
                    return a;
                },
            },
            new Validator(SortedWasteStations.sensorsPicks.name + "ModelValidator",
                SortedWasteStations.sensorsPicks.outputMongooseSchemaObject),
        );

        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + SortedWasteStations.name.toLowerCase();
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
        // send message to get and pair sensors
        this.sendMessageToExchange("workers." + this.queuePrefix + ".getSensors",
            new Buffer("Just Do It!"));
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

    public getSensors = async (msg: any): Promise<void> => {
        const data = await this.sensorsContainersDatasource.getAll();

        // send messages for pairing with containers
        const promises = data.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".pairSensorsWithContainers",
                new Buffer(JSON.stringify(p)));
        });
        await Promise.all(promises);

        await new Promise((done) => setTimeout(done, 15000)); // sleeps for 15 seconds

        // send message to update measurement
        this.sendMessageToExchange("workers." + this.queuePrefix + ".updateSensorsMeasurement",
            new Buffer("Just Do It!"));
        // send message to update picks
        this.sendMessageToExchange("workers." + this.queuePrefix + ".updateSensorsPicks",
            new Buffer("Just Do It!"));
    }

    public pairSensorsWithContainers = async (msg: any): Promise<void> => {
        const sensor = JSON.parse(msg.content.toString());

        const stationNumber = sensor.code.split("C")[0];
        const trashType = this.iprTransformation.getTrashTypeByString(sensor.trash_type);
        const station = await this.model.findOne({"properties.station_number": stationNumber});

        if (!station) {
            // station not exists, creating new station
            const last = await this.model.aggregate([
                { $group: { _id: null, lastId: { $max: "$properties.id" }}},
                { $project: { _id: 0, lastId: 1 }}]);
            await this.model.save({
                geometry: { coordinates: [ sensor.longitude, sensor.latitude ], type: "Point" },
                properties: {
                    accessibility: { description: "neznámá dostupnost", id: 3 },
                    containers: [{
                        cleaning_frequency: { duration: "P0W", frequency: 0, id: 0 },
                        container_type: sensor.bin_type,
                        sensor_id: sensor.id,
                        trash_type: trashType,
                    }],
                    district: null,
                    id: last[0].lastId + 1,
                    name: sensor.address,
                    station_number: stationNumber,
                    updated_at: new Date().getTime(),
                },
                type: "Feature",
            });
            log.warn("Error while getting sensors and pair them with containers. Station '"
                + stationNumber + "' was not found. New station was created.");
        } else {
            const foundContainerIndex = station.properties.containers.findIndex((container) => {
                return container.trash_type.id === trashType.id;
            });
            if (foundContainerIndex !== -1) {
                const foundContainer = station.properties.containers[foundContainerIndex];
                foundContainer.sensor_id = sensor.id;
                station.properties.containers.splice(foundContainerIndex, 1);
                station.properties.containers.push(foundContainer);
                await this.model.updateOneById(station.properties.id,
                    {$set: {"properties.containers": station.properties.containers}});
            } else {
                // container not exists, adding new container to station
                station.properties.containers.push({
                    cleaning_frequency: { duration: "P0W", frequency: 0, id: 0 },
                    container_type: sensor.bin_type,
                    sensor_id: sensor.id,
                    trash_type: trashType,
                });
                await this.model.updateOneById(station.properties.id,
                    {$set: {"properties.containers": station.properties.containers}});
                log.warn("Error while getting sensors and pair them with containers. Station '"
                    + stationNumber + "': Trash type '" + sensor.trash_type + "' was not found. "
                    + "New station was created.");
            }
        }
    }

    public updateSensorsMeasurement = async (msg: any): Promise<void> => {
        const to = new Date();
        const from = new Date();
        from.setHours(to.getHours() - 6); // last six hour from now
        this.sensorsMeasurementsHTTPSettings.body = JSON.stringify({from, to});
        this.sensorsMeasurementsDatasource.setProtocolStrategy(new HTTPProtocolStrategy(
            this.sensorsMeasurementsHTTPSettings));
        const data = await this.sensorsMeasurementsDatasource.getAll();

        await this.sensorsMeasurementsModel.save(data);

        // send messages for pairing with containers
        const promises = data.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateSensorsMeasurementInContainer",
                new Buffer(JSON.stringify(p)));
        });
        await Promise.all(promises);
    }

    public updateSensorsMeasurementInContainer = async (msg: any): Promise<void> => {
        const measurement = JSON.parse(msg.content.toString());
        const station = await this.model.findOne({"properties.containers.sensor_id": measurement.container_id});

        if (station) {
            const foundContainerIndex = station.properties.containers.findIndex((container) => {
                return container.sensor_id === measurement.container_id;
            });

            const foundContainer = station.properties.containers[foundContainerIndex];
            foundContainer.last_measurement = {
                measured_at_utc: measurement.measured_at_utc,
                percent_calculated: measurement.percent_calculated,
                prediction_utc: measurement.prediction_utc,
            };
            station.properties.containers.splice(foundContainerIndex, 1);
            station.properties.containers.push(foundContainer);
            await this.model.updateOneById(station.properties.id,
                {$set: {"properties.containers": station.properties.containers}});
        } else {
            throw new CustomError("Error while updating sensors measurement. Sensor id '"
                + measurement.container_id + "' was not found.", true, this.constructor.name, 1028);
        }
    }

    public updateSensorsPicks = async (msg: any): Promise<void> => {
        const to = new Date();
        const from = new Date();
        from.setHours(to.getHours() - 6); // last six hour from now
        this.sensorsPicksHTTPSettings.body = JSON.stringify({from, to});
        this.sensorsPicksDatasource.setProtocolStrategy(new HTTPProtocolStrategy(
            this.sensorsPicksHTTPSettings));
        const data = await this.sensorsPicksDatasource.getAll();

        await this.sensorsPicksModel.save(data);

        // send messages for pairing with containers
        const promises = data.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateSensorsPicksInContainer",
                new Buffer(JSON.stringify(p)));
        });
        await Promise.all(promises);
    }

    public updateSensorsPicksInContainer = async (msg: any): Promise<void> => {
        const pick = JSON.parse(msg.content.toString());
        const station = await this.model.findOne({"properties.containers.sensor_id": pick.container_id});

        if (station) {
            const foundContainerIndex = station.properties.containers.findIndex((container) => {
                return container.sensor_id === pick.container_id;
            });

            const foundContainer = station.properties.containers[foundContainerIndex];
            foundContainer.last_pick = {
                pick_at_utc: pick.pick_at_utc,
            };
            station.properties.containers.splice(foundContainerIndex, 1);
            station.properties.containers.push(foundContainer);
            await this.model.updateOneById(station.properties.id,
                {$set: {"properties.containers": station.properties.containers}});
        } else {
            throw new CustomError("Error while updating sensors picks. Sensor id '"
                + pick.container_id + "' was not found.", true, this.constructor.name, 1028);
        }
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
