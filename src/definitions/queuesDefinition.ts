"use strict";

import { CustomError, ErrorHandler } from "@golemio/errors";
import {
    AirQualityStations, BicycleParkings, CityDistricts, Gardens, GeneralImport, IceGatewaySensors,
    IceGatewayStreetLamps, MedicalInstitutions, MerakiAccessPoints, Meteosensors, MOS, MunicipalAuthorities,
    MunicipalPoliceStations, Parkings, ParkingZones, Playgrounds, PublicToilets, RopidGTFS, SharedBikes,
    SharedCars, SortedWasteStations, TrafficCameras, VehiclePositions, WasteCollectionYards, ZtpParkings,
} from "golemio-schema-definitions";
import { config } from "../core/config";
import { AMQPConnector } from "../core/connectors";
import { log } from "../core/helpers";
import { IQueueDefinition } from "../core/queueprocessors";
import { AirQualityStationsWorker } from "../modules/airqualitystations";
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
                    messageTtl: 59 * 60 * 1000,
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
                    messageTtl: 59 * 60 * 1000,
                },
                worker: AirQualityStationsWorker,
                workerMethod: "updateDistrict",
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
                    messageTtl: 23 * 60 * 1000,
                },
                worker: BicycleParkingsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 1000,
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
                    messageTtl: 15 * 24 * 60 * 60 * 1000,
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
                    messageTtl: 23 * 60 * 1000,
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
                    messageTtl: 4 * 60 * 1000,
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
                    messageTtl: 14 * 60 * 1000,
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
                    messageTtl: 25 * 24 * 60 * 1000,
                },
                worker: MedicalInstitutionsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateGeoAndDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 25 * 24 * 60 * 1000,
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
                    messageTtl: 4 * 60 * 1000,
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
                    messageTtl: 4 * 60 * 1000,
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
                    messageTtl: 23 * 60 * 1000,
                },
                worker: MunicipalAuthoritiesWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "refreshWaitingQueues",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 1 * 60 * 1000,
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
                    messageTtl: 23 * 60 * 1000,
                },
                worker: MunicipalPoliceStationsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateAddressAndDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 1000,
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
                    messageTtl: 4 * 60 * 1000,
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
                    messageTtl: 4 * 60 * 1000,
                },
                worker: ParkingsWorker,
                workerMethod: "updateAddressAndDistrict",
            },
            {
                name: "updateAverageOccupancy",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000,
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
                    messageTtl: 23 * 60 * 60 * 1000,
                },
                worker: ParkingZonesWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateTariffs",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000,
                },
                worker: ParkingZonesWorker,
                workerMethod: "updateTariffs",
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
                    messageTtl: 1 * 60 * 1000,
                },
                worker: PlaygroundsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateAddressAndDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 1000,
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
                    messageTtl: 23 * 60 * 1000,
                },
                worker: PublicToiletsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateAddressAndDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 1000,
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
                    messageTtl: 14 * 60 * 1000,
                },
                worker: RopidGTFSWorker,
                workerMethod: "checkForNewData",
            },
            {
                name: "downloadFiles",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000,
                },
                worker: RopidGTFSWorker,
                workerMethod: "downloadFiles",
            },
            {
                name: "transformData",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000,
                },
                worker: RopidGTFSWorker,
                workerMethod: "transformData",
            },
            {
                name: "saveDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000,
                },
                worker: RopidGTFSWorker,
                workerMethod: "saveDataToDB",
            },
            {
                customProcessFunction: async (msg: any): Promise<void> => {
                    const channel = await AMQPConnector.getChannel();
                    const queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();
                    try {
                        const qt = await channel.checkQueue(queuePrefix + ".transformData");
                        const qs = await channel.checkQueue(queuePrefix + ".saveDataToDB");
                        const worker = new RopidGTFSWorker();

                        if (qt.messageCount === 0 && qs.messageCount === 0) {
                            // for sure all messages are dispatched
                            await new Promise((done) => setTimeout(done, 20000)); // sleeps for 20 seconds
                            if (await worker.checkSavedRowsAndReplaceTables(msg)) {
                                channel.ack(msg);
                            } else {
                                ErrorHandler.handle(new CustomError("Error while checking RopidGTFS saved rows.", true,
                                    null, 1021));
                                channel.nack(msg, false, false);
                            }
                            log.verbose("[<] " + queuePrefix + ".checkingIfDone: done");
                        } else {
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
                    messageTtl: 23 * 60 * 60 * 1000,
                },
                worker: null,
                workerMethod: null,
            },
            {
                name: "downloadCisStops",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000,
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
                    messageTtl: 1 * 60 * 1000,
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
                    messageTtl: 1 * 60 * 1000,
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
                    messageTtl: 15 * 24 * 60 * 60 * 1000,
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 15 * 24 * 60 * 60 * 1000,
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "updateDistrict",
            },
            {
                name: "getSensors",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 1 * 24 * 60 * 60 * 1000,
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "getSensors",
            },
            {
                name: "pairSensorsWithContainers",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 1 * 24 * 60 * 60 * 1000,
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "pairSensorsWithContainers",
            },
            {
                name: "updateSensorsMeasurement",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 30 * 60 * 1000,
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "updateSensorsMeasurement",
            },
            {
                name: "updateSensorsMeasurementInContainer",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 30 * 60 * 1000,
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "updateSensorsMeasurementInContainer",
            },
            {
                name: "updateSensorsPicks",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 30 * 60 * 1000,
                },
                worker: SortedWasteStationsWorker,
                workerMethod: "updateSensorsPicks",
            },
            {
                name: "updateSensorsPicksInContainer",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 30 * 60 * 1000,
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
                    messageTtl: 1 * 60 * 1000,
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
                    messageTtl: 1 * 60 * 1000,
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
                    messageTtl: 59 * 60 * 1000,
                },
                worker: WasteCollectionYardsWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000,
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
                    messageTtl: 1 * 60 * 1000,
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
                    messageTtl: 1 * 60 * 1000,
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
                        messageTtl: 4 * 60 * 1000,
                    },
                    worker: TemplateWorker,
                    workerMethod: "TemplateQueue",
                },
            ],
        },
    */
];

export { definitions as queuesDefinition };
