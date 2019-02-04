"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import log from "../helpers/Logger";
import PurgeWorker from "../workers/PurgeWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const config = require("../config/ConfigLoader");

export default class PurgeQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + "purge";
    }

    public registerQueues = async (): Promise<void> => {
        await this.registerQueue(this.queuePrefix + ".deleteOldVehiclePositions",
            "*." + this.queuePrefix + ".deleteOldVehiclePositions", this.deleteOldVehiclePositions, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead" });
        await this.registerQueue(this.queuePrefix + ".deleteOldMerakiAccessPointsObservations",
            "*." + this.queuePrefix + ".deleteOldMerakiAccessPointsObservations",
                this.deleteOldMerakiAccessPointsObservations, {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead" });
    }

    protected deleteOldVehiclePositions = async (msg: any): Promise<void> => {
        try {
            const worker = new PurgeWorker();
            log.debug(" [>] " + this.queuePrefix + ".deleteOldVehiclePositions received some data.");
            await worker.deleteOldVehiclePositions();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".deleteOldVehiclePositions: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected deleteOldMerakiAccessPointsObservations = async (msg: any): Promise<void> => {
        try {
            const worker = new PurgeWorker();
            log.debug(" [>] " + this.queuePrefix + ".deleteOldMerakiAccessPointsObservations received some data.");
            await worker.deleteOldMerakiAccessPointsObservations();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".deleteOldMerakiAccessPointsObservations: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

}
