"use strict";

import { CustomError, ErrorHandler } from "@golemio/errors";
import {
    AirQualityStations, BicycleCounters, BicycleParkings, CityDistricts, Gardens, GeneralImport, IceGatewaySensors,
    IceGatewayStreetLamps, MedicalInstitutions, MerakiAccessPoints, Meteosensors, MOS, MunicipalAuthorities,
    MunicipalPoliceStations, Parkings, ParkingZones, Parkomats, Playgrounds, PublicToilets, RopidGTFS, SharedBikes,
    SharedCars, SortedWasteStations, TrafficCameras, VehiclePositions, WasteCollectionYards, ZtpParkings,
} from "@golemio/schema-definitions";
import { config } from "../core/config";
import { AMQPConnector } from "../core/connectors";
import { log } from "../core/helpers";
import { IQueueDefinition } from "../core/queueprocessors";
import { AirQualityStationsWorker } from "../modules/airqualitystations";
import { BicycleCountersWorker } from "../modules/bicyclecounters";
import { BicycleParkingsWorker } from "../modules/bicycleparkings";
import { CityDistrictsWorker } from "../modules/citydistricts";
import { GardensWorker } from "../modules/gardens";
import { GeneralWorker } from "../modules/general";
import { IceGatewaySensorsWorker } from "../modules/icegatewaysensors";
import { IceGatewayStreetLampsWorker } from "../modules/icegatewaystreetlamps";
import { MedicalInstitutionsWorker } from "../modules/medicalinstitutions";
import { MerakiAccessPointsWorker } from "../modules/merakiaccesspoints";
import { MeteosensorsWorker } from "../modules/meteosensors";
import { MosBEWorker } from "../modules/mosbe";
import { MosMAWorker } from "../modules/mosma/";
import { MunicipalAuthoritiesWorker } from "../modules/municipalauthorities";
import { MunicipalPoliceStationsWorker } from "../modules/municipalpolicestations";
import { ParkingsWorker } from "../modules/parkings";
import { ParkingZonesWorker } from "../modules/parkingzones";
import { ParkomatsWorker } from "../modules/parkomats";
import { PlaygroundsWorker } from "../modules/playgrounds";
import { PublicToiletsWorker } from "../modules/publictoilets";
import { PurgeWorker } from "../modules/purge";
import { RopidGTFSWorker } from "../modules/ropidgtfs";
import { SharedBikesWorker } from "../modules/sharedbikes";
import { SharedCarsWorker } from "../modules/sharedcars";
import { SortedWasteStationsWorker } from "../modules/sortedwastestations";
import { TrafficCamerasWorker } from "../modules/trafficcameras";
import { VehiclePositionsWorker } from "../modules/vehiclepositions";
import { WasteCollectionYardsWorker } from "../modules/wastecollectionyards";
import { ZtpParkingsWorker } from "../modules/ztpparkings";

const definitions: IQueueDefinition[] = [
    {
        name: GeneralImport.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + GeneralImport.name.toLocaleLowerCase(),
        queues: [
            {
                name: "import",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: GeneralWorker,
                workerMethod: "saveData",
            },
        ],
    },
    {
        name: AirQualityStations.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + AirQualityStations.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000, // 59 minutes
                },
                worker: AirQualityStationsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "saveDataToHistory",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: AirQualityStationsWorker,
                workerMethod: "saveDataToHistory",
            },
            {
                name: "updateDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000, // 59 minutes
                },
                worker: AirQualityStationsWorker,
                workerMethod: "updateDistrict",
            },
        ],
    },
    {
        name: BicycleCounters.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + BicycleCounters.name.toLowerCase(),
        queues: [
            {
                name: "refreshCameaDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000, // 4 minutes
                },
                worker: BicycleCountersWorker,
                workerMethod: "refreshCameaDataInDB",
            },
            {
                name: "refreshEcoCounterDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 14 * 60 * 1000, // 14 minutes
                },
                worker: BicycleCountersWorker,
                workerMethod: "refreshEcoCounterDataInDB",
            },
            {
                name: "updateCamea",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000, // 4 minutes
                },
                worker: BicycleCountersWorker,
                workerMethod: "updateCamea",
            },
            {
                name: "updateEcoCounter",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 14 * 60 * 1000, // 14 minutes
                },
                worker: BicycleCountersWorker,
                workerMethod: "updateEcoCounter",
            },
        ],
    },
    {
        name: BicycleParkings.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + BicycleParkings.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: BicycleParkingsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: BicycleParkingsWorker,
                workerMethod: "updateDistrict",
            },
        ],
    },
    {
        name: CityDistricts.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + CityDistricts.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 15 * 24 * 60 * 60 * 1000, // 15 days
                },
                worker: CityDistrictsWorker,
                workerMethod: "refreshDataInDB",
            },
        ],
    },
    {
        name: Gardens.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + Gardens.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: GardensWorker,
                workerMethod: "refreshDataInDB",
            },
        ],
    },
    {
        name: IceGatewaySensors.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + IceGatewaySensors.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000, // 4 minutes
                },
                worker: IceGatewaySensorsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "saveDataToHistory",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: IceGatewaySensorsWorker,
                workerMethod: "saveDataToHistory",
            },
        ],
    },
    {
        name: IceGatewayStreetLamps.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + IceGatewayStreetLamps.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 14 * 60 * 1000, // 14 minutes
                },
                worker: IceGatewayStreetLampsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "setDimValue",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: IceGatewayStreetLampsWorker,
                workerMethod: "setDimValue",
            },
        ],
    },
    {
        name: MedicalInstitutions.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + MedicalInstitutions.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 25 * 24 * 60 * 60 * 1000, // 25 days
                },
                worker: MedicalInstitutionsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateGeoAndDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 25 * 24 * 60 * 60 * 1000, // 25 days
                },
                worker: MedicalInstitutionsWorker,
                workerMethod: "updateGeoAndDistrict",
            },
        ],
    },
    {
        name: MerakiAccessPoints.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + MerakiAccessPoints.name.toLowerCase(),
        queues: [
            {
                name: "saveDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MerakiAccessPointsWorker,
                workerMethod: "saveDataToDB",
            },
        ],
    },
    {
        name: Meteosensors.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + Meteosensors.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000, // 4 minutes
                },
                worker: MeteosensorsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "saveDataToHistory",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MeteosensorsWorker,
                workerMethod: "saveDataToHistory",
            },
            {
                name: "updateDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000, // 4 minutes
                },
                worker: MeteosensorsWorker,
                workerMethod: "updateDistrict",
            },
        ],
    },
    {
        name: MOS.BE.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + MOS.BE.name.toLowerCase(),
        queues: [
            {
                name: "saveAccountsDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MosBEWorker,
                workerMethod: "saveAccountsDataToDB",
            },
            {
                name: "saveCouponsDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MosBEWorker,
                workerMethod: "saveCouponsDataToDB",
            },
            {
                name: "saveCustomersDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MosBEWorker,
                workerMethod: "saveCustomersDataToDB",
            },
            {
                name: "saveZonesDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MosBEWorker,
                workerMethod: "saveZonesDataToDB",
            },
        ],
    },
    {
        name: MOS.MA.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + MOS.MA.name.toLowerCase(),
        queues: [
            {
                name: "saveDeviceModelsDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MosMAWorker,
                workerMethod: "saveDeviceModelsDataToDB",
            },
            {
                name: "saveTicketActivationsDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MosMAWorker,
                workerMethod: "saveTicketActivationsDataToDB",
            },
            {
                name: "saveTicketInspectionsDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MosMAWorker,
                workerMethod: "saveTicketInspectionsDataToDB",
            },
            {
                name: "saveTicketPurchasesDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MosMAWorker,
                workerMethod: "saveTicketPurchasesDataToDB",
            },
        ],
    },
    {
        name: MunicipalAuthorities.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + MunicipalAuthorities.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: MunicipalAuthoritiesWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "refreshWaitingQueues",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 1 * 60 * 1000, // 1 minute
                },
                worker: MunicipalAuthoritiesWorker,
                workerMethod: "refreshWaitingQueues",
            },
            {
                name: "saveWaitingQueuesDataToHistory",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MunicipalAuthoritiesWorker,
                workerMethod: "saveWaitingQueuesDataToHistory",
            },
        ],
    },
    {
        name: MunicipalPoliceStations.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + MunicipalPoliceStations.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: MunicipalPoliceStationsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateAddressAndDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: MunicipalPoliceStationsWorker,
                workerMethod: "updateAddressAndDistrict",
            },
        ],
    },
    {
        name: Parkings.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + Parkings.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000, // 4 minutes
                },
                worker: ParkingsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "saveDataToHistory",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: ParkingsWorker,
                workerMethod: "saveDataToHistory",
            },
            {
                name: "updateAddressAndDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000, // 4 minutes
                },
                worker: ParkingsWorker,
                workerMethod: "updateAddressAndDistrict",
            },
            {
                name: "updateAverageOccupancy",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000, // 4 minutes
                },
                worker: ParkingsWorker,
                workerMethod: "updateAverageOccupancy",
            },
            {
                name: "saveOccupanciesToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: ParkingsWorker,
                workerMethod: "saveOccupanciesToDB",
            },
        ],
    },
    {
        name: ParkingZones.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + ParkingZones.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: ParkingZonesWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateTariffs",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: ParkingZonesWorker,
                workerMethod: "updateTariffs",
            },
        ],
    },
    {
        name: Parkomats.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + Parkomats.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 2 * 60 * 1000, // 2 minutes
                },
                worker: ParkomatsWorker,
                workerMethod: "refreshDataInDB",
            },
        ],
    },
    {
        name: Playgrounds.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + Playgrounds.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: PlaygroundsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateAddressAndDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: PlaygroundsWorker,
                workerMethod: "updateAddressAndDistrict",
            },
        ],
    },
    {
        name: PublicToilets.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + PublicToilets.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: PublicToiletsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateAddressAndDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: PublicToiletsWorker,
                workerMethod: "updateAddressAndDistrict",
            },
        ],
    },
    {
        name: "Purge",
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + "purge",
        queues: [
            {
                name: "deleteOldVehiclePositions",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: PurgeWorker,
                workerMethod: "deleteOldVehiclePositions",
            },
            {
                name: "deleteOldMerakiAccessPointsObservations",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: PurgeWorker,
                workerMethod: "deleteOldMerakiAccessPointsObservations",
            },
            {
                name: "deleteOldTrafficCamerasHistory",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: PurgeWorker,
                workerMethod: "deleteOldTrafficCamerasHistory",
            },
            {
                name: "deleteOldSharedBikes",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: PurgeWorker,
                workerMethod: "deleteOldSharedBikes",
            },
            {
                name: "deleteOldSharedCars",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: PurgeWorker,
                workerMethod: "deleteOldSharedCars",
            },
        ],
    },
    {
        name: RopidGTFS.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase(),
        queues: [
            {
                name: "checkForNewData",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 19 * 60 * 1000, // 19 minutes
                },
                worker: RopidGTFSWorker,
                workerMethod: "checkForNewData",
            },
            {
                name: "downloadFiles",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000, // 59 minutes
                },
                worker: RopidGTFSWorker,
                workerMethod: "downloadFiles",
            },
            {
                name: "transformData",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: RopidGTFSWorker,
                workerMethod: "transformData",
            },
            {
                name: "saveDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: RopidGTFSWorker,
                workerMethod: "saveDataToDB",
            },
            {
                customProcessFunction: async (msg: any): Promise<void> => {
                    const channel = await AMQPConnector.getChannel();
                    const queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();
                    try {
                        const worker = new RopidGTFSWorker();

                        // getting info about queues
                        const transformQueue = await channel.checkQueue(queuePrefix + ".transformData");
                        const saveQueue = await channel.checkQueue(queuePrefix + ".saveDataToDB");
                        // getting info from metadata table
                        const allSaved: boolean = await worker.checkAllTablesHasSavedState(msg);

                        log.debug(JSON.stringify({ allSaved, saveQueue, transformQueue }));

                        // checking if all queues are empty and all rows are saved
                        if (transformQueue.messageCount === 0 && saveQueue.messageCount === 0 && allSaved) {
                            // checking number of saved rows of all tables
                            // and process switch between tmp and public schema
                            if (await worker.checkSavedRowsAndReplaceTables(msg)) {
                                channel.ack(msg);
                            } else {
                                // numbers of saved rows are not equal with number of downloaded rows
                                ErrorHandler.handle(new CustomError("Error while checking RopidGTFS saved rows.", true,
                                    undefined, 5004));
                                channel.nack(msg, false, false);
                            }
                            log.verbose("[<] " + queuePrefix + ".checkingIfDone: done");
                        } else {
                            // process is not done, wait
                            await new Promise((done) => setTimeout(done, 60000)); // sleeps for 1 minute
                            channel.reject(msg);
                        }
                    } catch (err) {
                        ErrorHandler.handle(err);
                        channel.nack(msg, false, false);
                    }
                },
                name: "checkingIfDone",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: undefined,
                workerMethod: undefined,
            },
            {
                name: "downloadCisStops",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000, // minutes
                },
                worker: RopidGTFSWorker,
                workerMethod: "downloadCisStops",
            },
        ],
    },
    {
        name: SharedBikes.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + SharedBikes.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 1 * 60 * 1000, // 1 minute
                },
                worker: SharedBikesWorker,
                workerMethod: "refreshDataInDB",
            },
        ],
    },
    {
        name: SharedCars.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + SharedCars.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 1 * 60 * 1000, // 1 minute
                },
                worker: SharedCarsWorker,
                workerMethod: "refreshDataInDB",
            },
        ],
    },
    {
        name: SortedWasteStations.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + SortedWasteStations.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "updateDistrict",
            },
            {
                name: "getSensorsAndPairThemWithContainers",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "getSensorsAndPairThemWithContainers",
            },
            {
                name: "updateSensorsMeasurement",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 29 * 60 * 1000, // 29 minutes
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "updateSensorsMeasurement",
            },
            {
                name: "updateSensorsMeasurementInContainer",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 29 * 60 * 1000, // 29 minutes
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "updateSensorsMeasurementInContainer",
            },
            {
                name: "updateSensorsPicks",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 29 * 60 * 1000, // 29 minutes
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "updateSensorsPicks",
            },
            {
                name: "updateSensorsPicksInContainer",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 29 * 60 * 1000, // 29 minutes
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "updateSensorsPicksInContainer",
            },
        ],
    },
    {
        name: TrafficCameras.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + TrafficCameras.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 1 * 60 * 1000, // 1 minute
                },
                worker: TrafficCamerasWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "saveDataToHistory",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: TrafficCamerasWorker,
                workerMethod: "saveDataToHistory",
            },
            {
                name: "updateAddressAndDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 1 * 60 * 1000, // 1 minute
                },
                worker: TrafficCamerasWorker,
                workerMethod: "updateAddressAndDistrict",
            },
        ],
    },
    {
        name: VehiclePositions.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + VehiclePositions.name.toLowerCase(),
        queues: [
            {
                name: "saveDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: VehiclePositionsWorker,
                workerMethod: "saveDataToDB",
            },
            {
                name: "saveStopsToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: VehiclePositionsWorker,
                workerMethod: "saveStopsToDB",
            },
            {
                name: "updateGTFSTripId",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: VehiclePositionsWorker,
                workerMethod: "updateGTFSTripId",
            },
            {
                name: "updateDelay",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: VehiclePositionsWorker,
                workerMethod: "updateDelay",
            },
        ],
    },
    {
        name: WasteCollectionYards.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + WasteCollectionYards.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000, // 59 minutes
                },
                worker: WasteCollectionYardsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000, // 59 minutes
                },
                worker: WasteCollectionYardsWorker,
                workerMethod: "updateDistrict",
            },
        ],
    },
    {
        name: ZtpParkings.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + ZtpParkings.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000, // 59 minutes
                },
                worker: ZtpParkingsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "saveDataToHistory",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: ZtpParkingsWorker,
                workerMethod: "saveDataToHistory",
            },
            {
                name: "updateAddressAndDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000, // 59 minutes
                },
                worker: ZtpParkingsWorker,
                workerMethod: "updateAddressAndDistrict",
            },
            {
                name: "updateStatusAndDevice",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: ZtpParkingsWorker,
                workerMethod: "updateStatusAndDevice",
            },
        ],
    },
    /*
        // template
        {
            name: TemplateDataset.name,
            queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + TemplateDataset.name.toLowerCase(),
            queues: [
                {
                    name: "TemplateQueue",
                    options: {
                        deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                        deadLetterRoutingKey: "dead",
                        messageTtl: 4 * 60 * 1000, // in milliseconds
                    },
                    worker: TemplateWorker,
                    workerMethod: "TemplateQueue",
                },
            ],
        },
    */
];

export { definitions as queuesDefinition };
