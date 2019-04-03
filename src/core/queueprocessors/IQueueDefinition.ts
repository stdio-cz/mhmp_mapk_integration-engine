"use strict";

export interface IQueueDefinition {
    name: string;
    queuePrefix: string;
    queues: Array<{
        customProcessFunction?: (msg: any) => Promise<void>;
        name: string,
        options: any,
        worker: any, // TODO IWorker
        workerMethod: string,
    }>;
}
