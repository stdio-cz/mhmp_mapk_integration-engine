"use strict";

import * as JSONStream from "JSONStream";
import * as moment from "moment";

import { CustomError } from "@golemio/errors";
import { Energetics, EnergeticsTypes } from "@golemio/schema-definitions";
import { JSONSchemaValidator } from "@golemio/validator";

import { config } from "../../core/config";
import {
    DataSourceStream,
    DataSourceStreamed,
    HTTPProtocolStrategyStreamed,
    IHTTPSettings,
    JSONDataTypeStrategy,
} from "../../core/datasources";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import {
    DateParams,
    EnesaApi,
    EnesaEnergyBuildingsTransformation,
    EnesaEnergyConsumptionTransformation,
    EnesaEnergyDevicesTransformation,
    UnimonitorCemApi,
    VpalacMeasurementTransformation,
    VpalacMeasuringEquipmentTransformation,
    VpalacMeterTypeTransformation,
    VpalacTypeMeasuringEquipmentTransformation,
    VpalacUnitsTransformation,
} from "./";

import EnesaBuildings = EnergeticsTypes.Enesa.Buildings;
import EnesaConsumption = EnergeticsTypes.Enesa.Consumption;
import EnesaDevices = EnergeticsTypes.Enesa.Devices;

// TODO move to separate workers
export class EnergeticsWorker extends BaseWorker {
    private readonly datasourceEnesaEnergyBuildings: DataSourceStreamed;
    private readonly datasourceEnesaEnergyConsumption: DataSourceStreamed;
    private readonly datasourceEnesaEnergyConsumptionVisapp: DataSourceStreamed;
    private readonly datasourceEnesaEnergyDevices: DataSourceStreamed;
    private readonly datasourceVpalacMeasurement: DataSourceStreamed;
    private readonly datasourceVpalacMeasuringEquipment: DataSourceStreamed;
    private readonly datasourceVpalacMeterType: DataSourceStreamed;
    private readonly datasourceVpalacTypeMeasuringEquipment: DataSourceStreamed;
    private readonly datasourceVpalacUnits: DataSourceStreamed;

    private readonly transformationEnesaEnergyBuildings: EnesaEnergyBuildingsTransformation;
    private readonly transformationEnesaEnergyConsumption: EnesaEnergyConsumptionTransformation;
    private readonly transformationEnesaEnergyDevices: EnesaEnergyDevicesTransformation;
    private readonly transformationVpalacMeasurement: VpalacMeasurementTransformation;
    private readonly transformationVpalacMeasuringEquipment: VpalacMeasuringEquipmentTransformation;
    private readonly transformationVpalacMeterType: VpalacMeterTypeTransformation;
    private readonly transformationVpalacTypeMeasuringEquipment: VpalacTypeMeasuringEquipmentTransformation;
    private readonly transformationVpalacUnits: VpalacUnitsTransformation;

    private readonly modelEnesaEnergyBuildings: PostgresModel;
    private readonly modelEnesaEnergyConsumption: PostgresModel;
    private readonly modelEnesaEnergyDevices: PostgresModel;
    private readonly modelVpalacMeasurement: PostgresModel;
    private readonly modelVpalacMeasuringEquipment: PostgresModel;
    private readonly modelVpalacMeterType: PostgresModel;
    private readonly modelVpalacTypeMeasuringEquipment: PostgresModel;
    private readonly modelVpalacUnits: PostgresModel;

    constructor() {
        super();

        // Enesa Energy Buildings
        this.datasourceEnesaEnergyBuildings = new DataSourceStreamed(
            Energetics.enesa.buildings.name + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "",
                url: "",
            }).setStreamTransformer(JSONStream.parse("buildings.*")),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(Energetics.enesa.buildings.name + "DataSource",
                Energetics.enesa.buildings.datasourceJsonSchema));

        this.transformationEnesaEnergyBuildings = new EnesaEnergyBuildingsTransformation();
        this.modelEnesaEnergyBuildings = new PostgresModel(
            Energetics.enesa.buildings.name + "Model",
            {
                outputSequelizeAttributes: Energetics.enesa.buildings.outputSequelizeAttributes,
                pgTableName: Energetics.enesa.buildings.pgTableName,
                savingType: "insertOrUpdate",
            },
            new JSONSchemaValidator(
                Energetics.enesa.buildings.name + "ModelValidator",
                Energetics.enesa.buildings.outputJsonSchema,
            ),
        );

        // Enesa Energy Consumption
        this.datasourceEnesaEnergyConsumption = new DataSourceStreamed(
            Energetics.enesa.buildings.name + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "",
                url: "",
            }).setStreamTransformer(JSONStream.parse("*")),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(Energetics.enesa.consumption.name + "DataSource",
                Energetics.enesa.consumption.datasourceJsonSchema));

        this.datasourceEnesaEnergyConsumptionVisapp = new DataSourceStreamed(
            Energetics.enesa.consumption.name + "VisappDataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "",
                url: "",
            }).setStreamTransformer(JSONStream.parse("*")),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(Energetics.enesa.consumption.name + "VisappDataSource",
                Energetics.enesa.consumption.datasourceJsonSchema));

        this.transformationEnesaEnergyConsumption = new EnesaEnergyConsumptionTransformation();
        this.modelEnesaEnergyConsumption = new PostgresModel(
            Energetics.enesa.consumption.name + "Model",
            {
                outputSequelizeAttributes: Energetics.enesa.consumption.outputSequelizeAttributes,
                pgTableName: Energetics.enesa.consumption.pgTableName,
                savingType: "insertOrUpdate",
            },
            new JSONSchemaValidator(
                Energetics.enesa.consumption.name + "ModelValidator",
                Energetics.enesa.consumption.outputJsonSchema,
            ),
        );

        // Enesa Energy Devices
        this.datasourceVpalacMeasurement = new DataSourceStreamed(
            Energetics.enesa.devices.name + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "",
                url: "",
            }).setStreamTransformer(JSONStream.parse("devices.*")),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(Energetics.enesa.devices.name + "DataSource",
                Energetics.enesa.devices.datasourceJsonSchema));

        this.transformationEnesaEnergyDevices = new EnesaEnergyDevicesTransformation();
        this.modelEnesaEnergyDevices = new PostgresModel(
            Energetics.enesa.devices.name + "Model",
            {
                outputSequelizeAttributes: Energetics.enesa.devices.outputSequelizeAttributes,
                pgTableName: Energetics.enesa.devices.pgTableName,
                savingType: "insertOrUpdate",
            },
            new JSONSchemaValidator(
                Energetics.enesa.devices.name + "ModelValidator",
                Energetics.enesa.devices.outputJsonSchema,
            ),
        );

        // Vpalac Measurement
        this.datasourceVpalacMeasurement = new DataSourceStreamed(
            Energetics.vpalac.measurement.name + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "",
                url: "",
            }).setStreamTransformer(JSONStream.parse("*")),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(Energetics.vpalac.measurement.name + "DataSource",
                Energetics.vpalac.measurement.datasourceJsonSchema));

        this.transformationVpalacMeasurement = new VpalacMeasurementTransformation();
        this.modelVpalacMeasurement = new PostgresModel(
            Energetics.vpalac.measurement.name + "Model",
            {
                outputSequelizeAttributes: Energetics.vpalac.measurement.outputSequelizeAttributes,
                pgTableName: Energetics.vpalac.measurement.pgTableName,
                savingType: "insertOrUpdate",
            },
            new JSONSchemaValidator(
                Energetics.vpalac.measurement.name + "ModelValidator",
                Energetics.vpalac.measurement.outputJsonSchema,
            ),
        );

        // Vpalac Measuring Equipment
        this.datasourceVpalacMeasuringEquipment = new DataSourceStreamed(
            Energetics.vpalac.measuringEquipment.name + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "",
                url: "",
            }).setStreamTransformer(JSONStream.parse("*")),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(Energetics.vpalac.measuringEquipment.name + "DataSource",
                Energetics.vpalac.measuringEquipment.datasourceJsonSchema));

        this.transformationVpalacMeasuringEquipment = new VpalacMeasuringEquipmentTransformation();
        this.modelVpalacMeasuringEquipment = new PostgresModel(
            Energetics.vpalac.measuringEquipment.name + "Model",
            {
                outputSequelizeAttributes: Energetics.vpalac.measuringEquipment.outputSequelizeAttributes,
                pgTableName: Energetics.vpalac.measuringEquipment.pgTableName,
                savingType: "insertOrUpdate",
            },
            new JSONSchemaValidator(
                Energetics.vpalac.measuringEquipment.name + "ModelValidator",
                Energetics.vpalac.measuringEquipment.outputJsonSchema,
            ),
        );

        // Vpalac Meter Type
        this.datasourceVpalacMeterType = new DataSourceStreamed(
            Energetics.vpalac.meterType.name + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "",
                url: "",
            }).setStreamTransformer(JSONStream.parse("*")),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(Energetics.vpalac.meterType.name + "DataSource",
                Energetics.vpalac.meterType.datasourceJsonSchema));

        this.transformationVpalacMeterType = new VpalacMeterTypeTransformation();
        this.modelVpalacMeterType = new PostgresModel(
            Energetics.vpalac.meterType.name + "Model",
            {
                outputSequelizeAttributes: Energetics.vpalac.meterType.outputSequelizeAttributes,
                pgTableName: Energetics.vpalac.meterType.pgTableName,
                savingType: "insertOrUpdate",
            },
            new JSONSchemaValidator(
                Energetics.vpalac.meterType.name + "ModelValidator",
                Energetics.vpalac.meterType.outputJsonSchema,
            ),
        );

        // Vpalac Type Measuring Equipment
        this.datasourceVpalacTypeMeasuringEquipment = new DataSourceStreamed(
            Energetics.vpalac.typeMeasuringEquipment.name + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "",
                url: "",
            }).setStreamTransformer(JSONStream.parse("*")),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(Energetics.vpalac.typeMeasuringEquipment.name + "DataSource",
                Energetics.vpalac.typeMeasuringEquipment.datasourceJsonSchema));

        this.transformationVpalacTypeMeasuringEquipment = new VpalacTypeMeasuringEquipmentTransformation();
        this.modelVpalacTypeMeasuringEquipment = new PostgresModel(
            Energetics.vpalac.typeMeasuringEquipment.name + "Model",
            {
                outputSequelizeAttributes: Energetics.vpalac.typeMeasuringEquipment.outputSequelizeAttributes,
                pgTableName: Energetics.vpalac.typeMeasuringEquipment.pgTableName,
                savingType: "insertOrUpdate",
            },
            new JSONSchemaValidator(
                Energetics.vpalac.typeMeasuringEquipment.name + "ModelValidator",
                Energetics.vpalac.typeMeasuringEquipment.outputJsonSchema,
            ),
        );

        // Vpalac Units
        this.datasourceVpalacUnits = new DataSourceStreamed(
            Energetics.vpalac.units.name + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "",
                url: "",
            }).setStreamTransformer(JSONStream.parse("*")),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(Energetics.vpalac.units.name + "DataSource",
                Energetics.vpalac.units.datasourceJsonSchema));

        this.transformationVpalacUnits = new VpalacUnitsTransformation();
        this.modelVpalacUnits = new PostgresModel(
            Energetics.vpalac.units.name + "Model",
            {
                outputSequelizeAttributes: Energetics.vpalac.units.outputSequelizeAttributes,
                pgTableName: Energetics.vpalac.units.pgTableName,
                savingType: "insertOrUpdate",
            },
            new JSONSchemaValidator(
                Energetics.vpalac.units.name + "ModelValidator",
                Energetics.vpalac.units.outputJsonSchema,
            ),
        );
    }

    /**
     * Worker method - fetch Enesa data (last 2 days)
     */
    public fetchEnesa2DaysData = async (msg: any): Promise<void> => {
        const now = moment().tz(EnesaApi.API_DATE_TZ);
        const dateFrom = now.clone().subtract(2, "days").format(EnesaApi.API_DATE_FORMAT);
        const dateTo = now.format(EnesaApi.API_DATE_FORMAT);
        const dateParams: DateParams = {
            from: dateFrom,
            to: dateTo,
        };

        await this.saveEnesaDataToDB(dateParams);
    }

    /**
     * Worker method - fetch Vpalac data (last 1 hour)
     */
    public fetchVpalac1HourData = async (msg: any): Promise<void> => {
        const now = moment().tz(UnimonitorCemApi.API_DATE_TZ);
        const timeFrom = now.clone().subtract(1, "hour").valueOf().toString();
        const timeTo = now.valueOf().toString();
        const dateParams: DateParams = {
            from_ms: timeFrom,
            to_ms: timeTo,
        };

        await this.saveVpalacDataToDB(dateParams);
    }

    /**
     * Worker method - fetch Vpalac data (last 14 days)
     */
    public fetchVpalac14DaysData = async (msg: any): Promise<void> => {
        const now = moment().tz(UnimonitorCemApi.API_DATE_TZ);
        const dateFrom = now.clone().subtract(14, "days").format(UnimonitorCemApi.API_DATE_FORMAT);
        const dateTo = now.format(UnimonitorCemApi.API_DATE_FORMAT);
        const dateParams: DateParams = {
            from: dateFrom,
            to: dateTo,
        };

        await this.saveVpalacDataToDB(dateParams);
    }

    /**
     * Save and refresh Enesa data in DB
     */
    private saveEnesaDataToDB = async (dateParams: DateParams): Promise<void> => {
        // Update connection settings
        this.datasourceEnesaEnergyBuildings.protocolStrategy.setConnectionSettings(
            this.getEnesaConnectionSettings(EnesaApi.resourceType.Buildings, dateParams),
        );

        this.datasourceEnesaEnergyConsumption.protocolStrategy.setConnectionSettings(
            this.getEnesaConnectionSettings(EnesaApi.resourceType.Consumption, dateParams),
        );

        this.datasourceEnesaEnergyConsumptionVisapp.protocolStrategy.setConnectionSettings(
            this.getEnesaConnectionSettings(EnesaApi.resourceType.ConsumptionVisapp, dateParams),
        );

        this.datasourceEnesaEnergyDevices.protocolStrategy.setConnectionSettings(
            this.getEnesaConnectionSettings(EnesaApi.resourceType.Devices, dateParams),
        );

        // Proceed and save
        const apiPromises: Array<Promise<void>> = [];

        apiPromises.push(
            this.proceedDataStream(
                this.datasourceEnesaEnergyBuildings.getAll(false),
                async (data: EnesaBuildings.InputElement) => {
                    const transformedData = await this.transformationEnesaEnergyBuildings.transform(data);
                    await this.modelEnesaEnergyBuildings.save(transformedData);
                },
            ),
        );

        apiPromises.push(
            new Promise(async (resolve) => {
                // Process both consumption datasources sequentially
                await this.proceedDataStream(
                    this.datasourceEnesaEnergyConsumption.getAll(false),
                    async (data: EnesaBuildings.InputElement) => {
                        const transformedData = await this.transformationEnesaEnergyBuildings.transform(data);
                        await this.modelEnesaEnergyBuildings.save(transformedData);
                    },
                );

                await this.proceedDataStream(
                    this.datasourceEnesaEnergyConsumptionVisapp.getAll(false),
                    async (data: EnesaBuildings.InputElement) => {
                        const transformedData = await this.transformationEnesaEnergyBuildings.transform(data);
                        await this.modelEnesaEnergyBuildings.save(transformedData);
                    },
                );

                resolve();
            }),
        );

        apiPromises.push(
            this.proceedDataStream(
                this.datasourceEnesaEnergyDevices.getAll(false),
                async (data: EnesaDevices.InputElement) => {
                    const transformedData = await this.transformationEnesaEnergyDevices.transform(data);
                    await this.modelEnesaEnergyDevices.save(transformedData);
                },
            ),
        );

        // Resolve all API promises
        await Promise.all(apiPromises);
    }

    /**
     * Save and refresh Vpalac data in DB
     */
    private saveVpalacDataToDB = async (dateParams: DateParams): Promise<void> => {
        const { authCookie } = await UnimonitorCemApi.createSession();

        // Update connection settings
        this.datasourceVpalacMeasurement.protocolStrategy.setConnectionSettings(
            this.getVpalacConnectionSettings(
                UnimonitorCemApi.resourceType.Measurement,
                authCookie,
                dateParams,
            ),
        );

        this.datasourceVpalacMeasuringEquipment.protocolStrategy.setConnectionSettings(
            this.getVpalacConnectionSettings(
                UnimonitorCemApi.resourceType.MeasuringEquipment,
                authCookie,
                dateParams,
            ),
        );

        this.datasourceVpalacMeterType.protocolStrategy.setConnectionSettings(
            this.getVpalacConnectionSettings(
                UnimonitorCemApi.resourceType.MeterType,
                authCookie,
                dateParams,
            ),
        );

        this.datasourceVpalacTypeMeasuringEquipment.protocolStrategy.setConnectionSettings(
            this.getVpalacConnectionSettings(
                UnimonitorCemApi.resourceType.TypeMeasuringEquipment,
                authCookie,
                {
                    ...dateParams,
                    cis: "135",
                },
            ),
        );

        this.datasourceVpalacUnits.protocolStrategy.setConnectionSettings(
            this.getVpalacConnectionSettings(
                UnimonitorCemApi.resourceType.Units,
                authCookie,
                dateParams,
            ),
        );

        // Proceed and save
        const apiPromises: Array<Promise<void>> = [];

        apiPromises.push(
            this.proceedDataStream(
                this.datasourceVpalacMeasurement.getAll(false),
                async (data: any) => {
                    const transformedData = await this.transformationVpalacMeasurement.transform(data);
                    const dataPromises = transformedData.map((item) => {
                        return this.modelVpalacMeasurement.save(item);
                    });

                    await Promise.all(dataPromises);
                },
            ),
        );

        apiPromises.push(
            this.proceedDataStream(
                this.datasourceVpalacMeasuringEquipment.getAll(false),
                async (data: any) => {
                    const transformedData = await this.transformationVpalacMeasuringEquipment.transform(data);
                    await this.modelVpalacMeasuringEquipment.save(transformedData);
                },
            ),
        );

        apiPromises.push(
            this.proceedDataStream(
                this.datasourceVpalacMeterType.getAll(false),
                async (data: any) => {
                    const transformedData = await this.transformationVpalacMeterType.transform(data);
                    await this.modelVpalacMeterType.save(transformedData);
                },
            ),
        );

        apiPromises.push(
            this.proceedDataStream(
                this.datasourceVpalacTypeMeasuringEquipment.getAll(false),
                async (data: any) => {
                    const transformedData = await this.transformationVpalacTypeMeasuringEquipment.transform(data);
                    await this.modelVpalacTypeMeasuringEquipment.save(transformedData);
                },
            ),
        );

        apiPromises.push(
            this.proceedDataStream(
                this.datasourceVpalacUnits.getAll(false),
                async (data: any) => {
                    const transformedData = await this.transformationVpalacUnits.transform(data);
                    await this.modelVpalacUnits.save(transformedData);
                },
            ),
        );

        // Resolve all API promises
        await Promise.all(apiPromises);

        // Terminate API session
        await UnimonitorCemApi.terminateSession(authCookie);
    }

    /**
     * Proceed Vpalac data stream (generic)
     */
    private proceedDataStream = async (
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

    /**
     * Create and return Enesa connection settings
     */
    private getEnesaConnectionSettings = (resourceType: string, dateParams: DateParams): IHTTPSettings => {
        const baseUrl = config.datasources.EnesaApiEnergeticsUrl;
        const params = new URLSearchParams(dateParams);

        return {
            headers: config.datasources.EnesaApiEnergeticsHeaders,
            method: "GET",
            timeout: 20000,
            url: `${baseUrl}/${resourceType}?${params}`,
        };
    }

    /**
     * Create and return new Vpalac connection settings
     */
    private getVpalacConnectionSettings = (
        resourceType: string,
        authCookie: string,
        additionalParams: Record<string, string> = {},
    ): IHTTPSettings => {
        const params = new URLSearchParams({
            id: resourceType,
            ...additionalParams,
        });

        return {
            headers: {
                Cookie: authCookie,
            },
            method: "GET",
            timeout: 20000,
            url: `${config.datasources.UnimonitorCemApiEnergetics.url}?${params}`,
        };
    }
}
