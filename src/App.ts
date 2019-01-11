"use strict";

import handleError from "./helpers/errors/ErrorHandler";
import CityDistrictsQueueProcessor from "./queue-processors/CityDistrictsQueueProcessor";
import IceGatewaySensorsQueueProcessor from "./queue-processors/IceGatewaySensorsQueueProcessor";
import IceGatewayStreetLampsQueueProcessor from "./queue-processors/IceGatewayStreetLampsQueueProcessor";
import MerakiAccessPointsQueueProcessor from "./queue-processors/MerakiAccessPointsQueueProcessor";
import ParkingsQueueProcessor from "./queue-processors/ParkingsQueueProcessor";
import ParkingZonesQueueProcessor from "./queue-processors/ParkingZonesQueueProcessor";
import PurgeQueueProcessor from "./queue-processors/PurgeQueueProcessor";
import RopidGTFSQueueProcessor from "./queue-processors/RopidGTFSQueueProcessor";
import VehiclePositionsQueueProcessor from "./queue-processors/VehiclePositionsQueueProcessor";

const { AMQPConnector } = require("./helpers/AMQPConnector");
const { mongooseConnection } = require("./helpers/MongoConnector");
const { PostgresConnector } = require("./helpers/PostgresConnector");
const log = require("debug")("data-platform:integration-engine:info");
const config = require("./config/ConfigLoader");

class App {

    /**
     * Starts the application
     */
    public start = async (): Promise<void> => {
        try {
            log("Configuration loaded: " + JSON.stringify(config));
            await this.database();
            await this.queueProcessors();
            log("Started!");
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
        await Promise.all([
            new CityDistrictsQueueProcessor(ch).registerQueues(),
            new IceGatewaySensorsQueueProcessor(ch).registerQueues(),
            new IceGatewayStreetLampsQueueProcessor(ch).registerQueues(),
            new MerakiAccessPointsQueueProcessor(ch).registerQueues(),
            new ParkingsQueueProcessor(ch).registerQueues(),
            new ParkingZonesQueueProcessor(ch).registerQueues(),
            new PurgeQueueProcessor(ch).registerQueues(),
            new RopidGTFSQueueProcessor(ch).registerQueues(),
            new VehiclePositionsQueueProcessor(ch).registerQueues(),
            // ...ready to register more queue processors
        ]);
    }

}

export default new App().start();
