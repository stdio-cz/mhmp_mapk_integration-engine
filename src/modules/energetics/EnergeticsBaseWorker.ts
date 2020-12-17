"use strict";

import { CustomError } from "@golemio/errors";

import { DataSourceStream } from "../../core/datasources";
import { BaseWorker } from "../../core/workers";

abstract class EnergeticsBaseWorker extends BaseWorker {
    constructor() {
        super();
    }

    /**
     * Process generic data stream
     */
    protected processDataStream = async (
        dataSourceStream: Promise<DataSourceStream>,
        onDataFunction: (data: any) => Promise<void>,
    ): Promise<void> => {
        let dataStream: DataSourceStream;

        try {
            dataStream = await dataSourceStream;
        } catch (err) {
            throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
        }

        try {
            await dataStream.setDataProcessor(onDataFunction).proceed();
        } catch (err) {
            throw new CustomError("Error while processing data.", true, this.constructor.name, 5051, err);
        }
    }
}

export { EnergeticsBaseWorker };
