"use strict";

import {
    AirQualityStations, BicycleCounters, BicycleParkings, CityDistricts, FirebasePidlitacka, Flow, Gardens,
    GeneralImport, MedicalInstitutions, MerakiAccessPoints, Meteosensors, MobileAppStatistics, MOS,
    MunicipalAuthorities, MunicipalLibraries, MunicipalPoliceStations, Parkings, ParkingZones, Parkomats,
    Playgrounds, PublicToilets, RopidGTFS, SharedBikes, SharedCars, SortedWasteStations,
    TrafficCameras, TSKSTD, VehiclePositions, WasteCollectionYards, WazeCCP,
} from "@golemio/schema-definitions";
import { config } from "../core/config";
import { IQueueDefinition } from "../core/queueprocessors";
import { AirQualityStationsWorker } from "../modules/airqualitystations";
import { BicycleCountersWorker } from "../modules/bicyclecounters";
import { BicycleParkingsWorker } from "../modules/bicycleparkings";
import { CityDistrictsWorker } from "../modules/citydistricts";
import { FirebasePidlitackaWorker } from "../modules/firebasepidlitacka";
import { FlowWorker } from "../modules/flow";
import { GardensWorker } from "../modules/gardens";
import { GeneralWorker } from "../modules/general";
import { MedicalInstitutionsWorker } from "../modules/medicalinstitutions";
import { MerakiAccessPointsWorker } from "../modules/merakiaccesspoints";
import { MeteosensorsWorker } from "../modules/meteosensors";
import { MobileAppStatisticsWorker } from "../modules/mobileappstatistics";
import { MosBEWorker } from "../modules/mosbe";
import { MosMAWorker } from "../modules/mosma/";
import { MunicipalAuthoritiesWorker } from "../modules/municipalauthorities";
import { MunicipalLibrariesWorker } from "../modules/municipallibraries";
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
import { TrafficDetectorsWorker } from "../modules/trafficdetectors";
import { VehiclePositionsWorker } from "../modules/vehiclepositions";
import { WasteCollectionYardsWorker } from "../modules/wastecollectionyards";
import { WazeCCPWorker } from "../modules/wazeccp";

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
                name: "refresh1HDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000, // 59 minutes
                },
                worker: AirQualityStationsWorker,
                workerMethod: "refresh1HDataInDB",
            },
            {
                name: "refresh3HDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000, // 59 minutes
                },
                worker: AirQualityStationsWorker,
                workerMethod: "refresh3HDataInDB",
            },
        ],
    },
    {
        name: BicycleCounters.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + BicycleCounters.name.toLowerCase(),
        queues: [
            {
                name: "getApiLogs",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 14 * 60 * 1000, // 14 minutes
                },
                worker: BicycleCountersWorker,
                workerMethod: "getApiLogs",
            },
            {
                name: "saveApiLogs",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 14 * 60 * 1000, // 14 minutes
                },
                worker: BicycleCountersWorker,
                workerMethod: "saveApiLogs",
            },
            {
                name: "refreshCameaDataLastXHoursInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 14 * 60 * 1000, // 14 minutes
                },
                worker: BicycleCountersWorker,
                workerMethod: "refreshCameaDataLastXHoursInDB",
            },
            {
                name: "refreshCameaDataPreviousDayInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 1000, // 23 minutes
                },
                worker: BicycleCountersWorker,
                workerMethod: "refreshCameaDataPreviousDayInDB",
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
        name: FirebasePidlitacka.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + FirebasePidlitacka.name.toLowerCase(),
        queues: [
            {
                name: "moveAll",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: FirebasePidlitackaWorker,
                workerMethod: "moveAll",
            },
            {
                name: "moveAppLaunch",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: FirebasePidlitackaWorker,
                workerMethod: "moveAppLaunch",
            },
            {
                name: "moveEvents",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: FirebasePidlitackaWorker,
                workerMethod: "moveEvents",
            },
            {
                name: "moveRoute",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: FirebasePidlitackaWorker,
                workerMethod: "moveRoute",
            },
            {
                name: "moveWebEvents",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: FirebasePidlitackaWorker,
                workerMethod: "moveWebEvents",
            },
        ],
    },
    {
        name: Flow.detections.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + Flow.detections.name.toLowerCase(),
        queues: [
            {
                name: "refreshCubes",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: FlowWorker,
                workerMethod: "refreshCubes",
            },
            {
                name: "getAnalytics",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: FlowWorker,
                workerMethod: "getAnalytics",
            },
            {
                name: "getSinks",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: FlowWorker,
                workerMethod: "getSinks",
            },
            {
                name: "getSinksHistoryPayloads",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: FlowWorker,
                workerMethod: "getSinksHistoryPayloads",
            },
            {
                name: "getSinksHistory",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: FlowWorker,
                workerMethod: "getSinksHistory",
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
        name: MobileAppStatistics.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + MobileAppStatistics.name.toLowerCase(),
        queues: [
            {
                name: "refreshAppStoreDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: MobileAppStatisticsWorker,
                workerMethod: "refreshAppStoreDataInDB",
            },
            {
                name: "refreshPlayStoreDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: MobileAppStatisticsWorker,
                workerMethod: "refreshPlayStoreDataInDB",
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
                name: "saveTokensDataToDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MosBEWorker,
                workerMethod: "saveTokensDataToDB",
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
            {
                name: "transformAndSaveChunkedData",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: MosMAWorker,
                workerMethod: "transformAndSaveChunkedData",
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
        name: MunicipalLibraries.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + MunicipalLibraries.name.toLowerCase(),
        queues: [
            {
                name: "refreshDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000, // 59 minutes
                },
                worker: MunicipalLibrariesWorker,
                workerMethod: "refreshDataInDB",
            },
            {
                name: "updateDistrict",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 59 * 60 * 1000, // 59 minutes
                },
                worker: MunicipalLibrariesWorker,
                workerMethod: "updateDistrict",
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
                name: "checkSavedRowsAndReplaceTables",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000, // 23 hours
                },
                worker: RopidGTFSWorker,
                workerMethod: "checkSavedRowsAndReplaceTables",
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
        name: TSKSTD.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + TSKSTD.name.toLowerCase(),
        queues: [
            {
                name: "saveNewTSKSTDDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 1 * 60 * 1000, // 1 minute
                },
                worker: TrafficDetectorsWorker,
                workerMethod: "saveNewTSKSTDDataInDB",
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
            {
                name: "generateGtfsRt",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                },
                worker: VehiclePositionsWorker,
                workerMethod: "generateGtfsRt",
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
        name: WazeCCP.name,
        queuePrefix: config.RABBIT_EXCHANGE_NAME + "." + WazeCCP.name.toLowerCase(),
        queues: [
            {
                name: "refreshAllDataInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000, // 4 minutes
                },
                worker: WazeCCPWorker,
                workerMethod: "refreshAllDataInDB",
            },
            {
                name: "refreshAlertsInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000, // 4 minutes
                },
                worker: WazeCCPWorker,
                workerMethod: "refreshAlertsInDB",
            },
            {
                name: "refreshIrregularitiesInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000, // 4 minutes
                },
                worker: WazeCCPWorker,
                workerMethod: "refreshIrregularitiesInDB",
            },
            {
                name: "refreshJamsInDB",
                options: {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 4 * 60 * 1000, // 4 minutes
                },
                worker: WazeCCPWorker,
                workerMethod: "refreshJamsInDB",
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
        {
            customProcessFunction: async (msg: any): Promise<void> => {
                const channel = await AMQPConnector.getChannel();

                console.log(msg.content.toString());

                // process is not done, wait
                await new Promise((done) => setTimeout(done, 10000)); // sleeps for 10 seconds
                channel.reject(msg);
            },
            name: "TemplateQueue",
            options: {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
            },
            worker: undefined,
            workerMethod: undefined,
        },
    */
];

export { definitions as queuesDefinition };
