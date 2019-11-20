"use strict";

import { CustomError } from "@golemio/errors";
import { config } from "../config";
import { AMQPConnector } from "../connectors";

export class BaseWorker {

    protected sendMessageToExchange = async (key: string, msg: any, options: object = {}): Promise<any> => {
        try {
            const channel = await AMQPConnector.getChannel();
            channel.assertExchange(config.RABBIT_EXCHANGE_NAME, "topic", { durable: false });
            channel.publish(config.RABBIT_EXCHANGE_NAME, key, Buffer.from(msg), options);
        } catch (err) {
            throw new CustomError("Sending the message to exchange failed.", true, this.constructor.name, 1003, err);
        }
    }

}
