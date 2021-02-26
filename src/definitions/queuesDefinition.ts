import { CustomError } from "@golemio/core/dist/shared/golemio-errors";
import { IQueueDefinition } from "@golemio/core/dist/integration-engine";

// See package.json for installed datasets (@golemio/* packages)
// and https://gitlab.com/operator-ict/golemio/code/modules for available datasets
const datasets = [
    "air-quality-stations",
    "bicycle-counters",
    "bicycle-parkings",
    "city-districts",
    "counters",
    "energetics",
    "firebase-pid-litacka",
    "flow",
    "gardens",
    "general",
    "medical-institutions",
    "meteosensors",
    "mobile-app-statistics",
    "mos",
    "municipal-authorities",
    "municipal-libraries",
    "municipal-police-stations",
    "parkings",
    "parking-zones",
    "parkomats",
    "playgrounds",
    "public-toilets",
    "purge",
    "ropid-gtfs",
    "shared-bikes",
    "shared-cars",
    "sorted-waste-stations",
    "traffic-cameras",
    "traffic-detectors",
    "vehicle-positions",
    "waste-collection-yards",
    "waze-ccp",
];

const definitions = datasets.reduce(async (accProm, dataset) => {
    const pkg = `@golemio/${dataset}/dist/integration-engine`;
    const acc = await accProm;

    try {
        const { queueDefinitions } = await import(pkg);
        return acc.concat(...queueDefinitions);
    } catch (err) {
        throw new CustomError(`Cannot import queue definitions from ${pkg}.`, false, undefined, 6004);
    }
}, Promise.resolve([] as IQueueDefinition[]));

export { definitions as queuesDefinition };
