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

// import { queueDefinitions as airQuailityStations } from "@golemio/air-quality-stations/dist/integration-engine";
// import { queueDefinitions as bicycleCounters } from "@golemio/bicycle-counters/dist/integration-engine";
// import { queueDefinitions as bicycleParkings } from "@golemio/bicycle-parkings/dist/integration-engine";
// import { queueDefinitions as cityDistricts } from "@golemio/city-districts/dist/integration-engine";
// import { queueDefinitions as counters } from "@golemio/counters/dist/integration-engine";
// import { queueDefinitions as energetics } from "@golemio/energetics/dist/integration-engine";
// import { queueDefinitions as firebasePidLitacka } from "@golemio/firebase-pid-litacka/dist/integration-engine";
// import { queueDefinitions as flow } from "@golemio/flow/dist/integration-engine";
// import { queueDefinitions as gardens } from "@golemio/gardens/dist/integration-engine";
// import { queueDefinitions as general } from "@golemio/general/dist/integration-engine";
// import { queueDefinitions as medicalInstitutions } from "@golemio/medical-institutions/dist/integration-engine";
// import { queueDefinitions as meteosensors } from "@golemio/meteosensors/dist/integration-engine";
// import { queueDefinitions as mobileAppStatistics } from "@golemio/mobile-app-statistics/dist/integration-engine";
// import { queueDefinitions as mos } from "@golemio/mos/dist/integration-engine";
// import { queueDefinitions as municipalAuthorities } from "@golemio/municipal-authorities/dist/integration-engine";
// import { queueDefinitions as municipalLibraries } from "@golemio/municipal-libraries/dist/integration-engine";
// import { queueDefinitions as municipalPoliceStations } from "@golemio/municipal-police-stations/dist/integration-engine";
// import { queueDefinitions as parkings } from "@golemio/parkings/dist/integration-engine";
// import { queueDefinitions as parkingZones } from "@golemio/parking-zones/dist/integration-engine";
// import { queueDefinitions as parkomats } from "@golemio/parkomats/dist/integration-engine";
// import { queueDefinitions as playgrounds } from "@golemio/playgrounds/dist/integration-engine";
// import { queueDefinitions as publicToilets } from "@golemio/public-toilets/dist/integration-engine";
// import { queueDefinitions as purge } from "@golemio/purge/dist/integration-engine";
// import { queueDefinitions as ropidGTFS } from "@golemio/ropid-gtfs/dist/integration-engine";
// import { queueDefinitions as sharedBikes } from "@golemio/shared-bikes/dist/integration-engine";
// import { queueDefinitions as sharedCars } from "@golemio/shared-cars/dist/integration-engine";
// import { queueDefinitions as sortedWasteStations } from "@golemio/sorted-waste-stations/dist/integration-engine";
// import { queueDefinitions as trafficCameras } from "@golemio/traffic-cameras/dist/integration-engine";
// import { queueDefinitions as trafficDetectors } from "@golemio/traffic-detectors/dist/integration-engine";
// import { queueDefinitions as vehiclePositions } from "@golemio/vehicle-positions/dist/integration-engine";
// import { queueDefinitions as wasteCollectionYards } from "@golemio/waste-collection-yards/dist/integration-engine";
// import { queueDefinitions as wazeCCP } from "@golemio/waze-ccp/dist/integration-engine";

// const definitions: IQueueDefinition[] = [
//     ...airQuailityStations,
//     ...bicycleCounters,
//     ...bicycleParkings,
//     ...cityDistricts,
//     ...counters,
//     ...energetics,
//     ...firebasePidLitacka,
//     ...flow,
//     ...gardens,
//     ...general,
//     ...medicalInstitutions,
//     ...meteosensors,
//     ...mobileAppStatistics,
//     ...mos,
//     ...municipalAuthorities,
//     ...municipalLibraries,
//     ...municipalPoliceStations,
//     ...parkings,
//     ...parkingZones,
//     ...parkomats,
//     ...playgrounds,
//     ...publicToilets,
//     ...purge,
//     ...ropidGTFS,
//     ...sharedBikes,
//     ...sharedCars,
//     ...sortedWasteStations,
//     ...trafficCameras,
//     ...trafficDetectors,
//     ...vehiclePositions,
//     ...wasteCollectionYards,
//     ...wazeCCP,
// ];
