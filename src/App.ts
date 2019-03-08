"use strict";

import handleError from "./helpers/errors/ErrorHandler";
import log from "./helpers/Logger";
import QueueProcessor from "./queue-processors/QueueProcessor";

const { AMQPConnector } = require("./helpers/AMQPConnector");
const { mongooseConnection } = require("./helpers/MongoConnector");
const { PostgresConnector } = require("./helpers/PostgresConnector");
const config = require("./config/ConfigLoader");
const queuesDefinitions = require("./definitions/queuesDefinition");

class App {

    /**
     * Starts the application
     */
    public start = async (): Promise<void> => {
        try {
            log.debug("Configuration loaded: " + JSON.stringify(config));
            await this.database();
            await this.queueProcessors();
            log.info("Started!");
        } catch (err) {
            handleError(err);
        }
    }

    /**
     * Starts the database connection with initial configuration
     */
    private database = async (): Promise<void> => {
        await mongooseConnection;
        await PostgresConnector.connect();
    }

    /**
     * Starts the message queue connection, creates communication channel
     * and register queue processors to consume messages
     */
    private queueProcessors = async (): Promise<void> => {
        const ch = await AMQPConnector.connect();

        // TODO add to config or definitions
        const blacklist = {
            // MerakiAccessPoints: [], // all queues of the dataset
            // Parkings: ["saveDataToHistory", "updateAverageOccupancy"], // only mentioned queues of the dataset
            // AirQualityStations: [],
            // CityDistricts: [],
            // Gardens: [],
            // IceGatewaySensors: [],
            // IceGatewayStreetLamps: [],
            // MedicalInstitutions: [],
            // MerakiAccessPoints: [],
            // Meteosensors: [],
            // MunicipalAuthorities: [],
            // MunicipalPoliceStations: [],
            // ParkingZones: [],
            // Parkings: [],
            // Playgrounds: [],
            // PublicToilets: [],
            // Purge: [],
            // RopidGTFS: [],
            // SharedCars: [],
            // SkodaPalaceQueues: [],
            // TrafficCameras: [],
            // VehiclePositions: [],
            // WasteCollectionYards: [],
        };

        // filtering queue definitions by blacklist
        let filteredQueuesDefinitions = queuesDefinitions;
        Object.keys(blacklist).map((b) => {
            if (blacklist[b].length === 0) {
                filteredQueuesDefinitions = filteredQueuesDefinitions.filter((a) => a.name !== b);
            } else {
                blacklist[b].map((d) => {
                    filteredQueuesDefinitions = filteredQueuesDefinitions.map((a) => {
                        a.queues = a.queues.filter((c) => c.name !== d);
                        return a;
                    });
                });
            }
        });

        // use generic queue processor for register (filtered) queues
        const promises = filteredQueuesDefinitions.map((queueDefinition) => {
            return new QueueProcessor(ch, queueDefinition).registerQueues();
        });
        await Promise.all(promises);
    }

}

export default new App().start();
