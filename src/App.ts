"use strict";

import handleError from "./helpers/errors/ErrorHandler";
import CityDistrictsQueueProcessor from "./queue-processors/CityDistrictsQueueProcessor";
import IGSensorsQueueProcessor from "./queue-processors/IGSensorsQueueProcessor";
import IGStreetLampsQueueProcessor from "./queue-processors/IGStreetLampsQueueProcessor";
import ParkingsQueueProcessor from "./queue-processors/ParkingsQueueProcessor";
import ParkingZonesQueueProcessor from "./queue-processors/ParkingZonesQueueProcessor";
import VehiclePositionsQueueProcessor from "./queue-processors/VehiclePositionsQueueProcessor";

const { amqpChannel } = require("./helpers/AMQPConnector");
const { mongooseConnection } = require("./helpers/MongoConnector");
const { sequelizeConnection } = require("./helpers/PostgresConnector");
const log = require("debug")("data-platform:integration-engine");
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
        await sequelizeConnection;
    }

    /**
     * Starts the message queue connection, creates communication channel
     * and register queue processors to consume messages
     */
    private queueProcessors = async (): Promise<void> => {
        const ch = await amqpChannel;
        await Promise.all([
            new ParkingsQueueProcessor(ch).registerQueues(),
            new CityDistrictsQueueProcessor(ch).registerQueues(),
            new IGSensorsQueueProcessor(ch).registerQueues(),
            new IGStreetLampsQueueProcessor(ch).registerQueues(),
            new ParkingZonesQueueProcessor(ch).registerQueues(),
            new VehiclePositionsQueueProcessor(ch).registerQueues(),
            // ...ready to register more queue processors
        ]);
    }

}

export default new App().start();
