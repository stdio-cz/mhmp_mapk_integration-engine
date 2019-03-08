"use strict";

import {
    AirQualityStations, CityDistricts, Gardens, IceGatewaySensors, IceGatewayStreetLamps, MedicalInstitutions,
    MerakiAccessPoints, Meteosensors, MunicipalAuthorities, MunicipalPoliceStations, Parkings, ParkingZones,
    Playgrounds, PublicToilets, RopidGTFS, SharedCars, SkodaPalaceQueues, TrafficCameras, VehiclePositions,
    WasteCollectionYards,
    } from "data-platform-schema-definitions";
import CustomError from "../helpers/errors/CustomError";
import handleError from "../helpers/errors/ErrorHandler";
import log from "../helpers/Logger";
import AirQualityStationsWorker from "../workers/AirQualityStationsWorker";
import CityDistrictsWorker from "../workers/CityDistrictsWorker";
import GardensWorker from "../workers/GardensWorker";
import IceGatewaySensorsWorker from "../workers/IceGatewaySensorsWorker";
import IceGatewayStreetLampsWorker from "../workers/IceGatewayStreetLampsWorker";
import MedicalInstitutionsWorker from "../workers/MedicalInstitutionsWorker";
import MerakiAccessPointsWorker from "../workers/MerakiAccessPointsWorker";
import MeteosensorsWorker from "../workers/MeteosensorsWorker";
import MunicipalAuthoritiesWorker from "../workers/MunicipalAuthoritiesWorker";
import MunicipalPoliceStationsWorker from "../workers/MunicipalPoliceStationsWorker";
import ParkingsWorker from "../workers/ParkingsWorker";
import ParkingZonesWorker from "../workers/ParkingZonesWorker";
import PlaygroundsWorker from "../workers/PlaygroundsWorker";
import PublicToiletsWorker from "../workers/PublicToiletsWorker";
import PurgeWorker from "../workers/PurgeWorker";
import RopidGTFSWorker from "../workers/RopidGTFSWorker";
import SharedCarsWorker from "../workers/SharedCarsWorker";
import SkodaPalaceQueuesWorker from "../workers/SkodaPalaceQueuesWorker";
import TrafficCamerasWorker from "../workers/TrafficCamerasWorker";
import VehiclePositionsWorker from "../workers/VehiclePositionsWorker";
import WasteCollectionYardsWorker from "../workers/WasteCollectionYardsWorker";
import IQueueDefinition from "./IQueueDefinition";

const config = require("../config/ConfigLoader");
const { AMQPConnector } = require("../helpers/AMQPConnector");

const definitions: IQueueDefinition[] = [
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
                            await new Promise((done) => setTimeout(done, 10000)); // sleeps for 10 seconds
                            if (await worker.checkSavedRowsAndReplaceTables(msg)) {
                                channel.ack(msg);
                            } else {
                                handleError(new CustomError("Error while checking RopidGTFS saved rows.", true,
                                    this.constructor.name, 1021));
                                channel.nack(msg, false, false);
                            }
                            log.verbose("[<] " + queuePrefix + ".checkingIfDone: done");
                        } else {
                            await new Promise((done) => setTimeout(done, 5000)); // sleeps for 5 seconds
                            channel.reject(msg);
                        }
                    } catch (err) {
                        handleError(err);
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
            {
                name: "refreshDataForDelayCalculation",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000,
                },
                worker: RopidGTFSWorker,
                workerMethod: "refreshDataForDelayCalculation",
            },
            {
                name: "saveDataForDelayCalculation",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000,
                },
                worker: RopidGTFSWorker,
                workerMethod: "saveDataForDelayCalculation",
            },
            {
                customProcessFunction: async (msg: any) => {
                    const channel = await AMQPConnector.getChannel();
                    const queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();
                    try {
                        const qs = await channel.checkQueue(queuePrefix + ".saveDataForDelayCalculation");
                        const worker = new RopidGTFSWorker();

                        if (qs.messageCount === 0) {
                            // for sure all messages are dispatched
                            await new Promise((done) => setTimeout(done, 10000)); // sleeps for 10 seconds
                            if (await worker.checkSavedRowsAndReplaceTablesForDelayCalculation(msg)) {
                                channel.ack(msg);
                            } else {
                                handleError(new CustomError("Error while checking RopidGTFS saved rows.", true,
                                    this.constructor.name, 1021));
                                channel.nack(msg, false, false);
                            }
                            log.verbose("[<] " + queuePrefix + ".checkingIfDoneDelayCalculation: done");
                        } else {
                            await new Promise((done) => setTimeout(done, 5000)); // sleeps for 5 seconds
                            channel.reject(msg);
                        }
                    } catch (err) {
                        handleError(err);
                        channel.nack(msg, false, false);
                    }
                },
                name: "checkingIfDoneDelayCalculation",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000,
                },
                worker: null,
                workerMethod: null,
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
        name: SkodaPalaceQueues.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + SkodaPalaceQueues.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 1 * 60 * 1000,
                },
                worker: SkodaPalaceQueuesWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "saveDataToHistory",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: SkodaPalaceQueuesWorker,
                workerMethod: "saveDataToHistory",
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

module.exports = definitions;
