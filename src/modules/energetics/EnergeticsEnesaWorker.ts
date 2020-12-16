"use strict";

import * as JSONStream from "JSONStream";
import * as moment from "moment";

import { Energetics, EnergeticsTypes } from "@golemio/schema-definitions";
import { JSONSchemaValidator } from "@golemio/validator";

import { config } from "../../core/config";
import {
    DataSourceStreamed,
    HTTPProtocolStrategyStreamed,
    IHTTPSettings,
    JSONDataTypeStrategy,
} from "../../core/datasources";
import { PostgresModel } from "../../core/models";
import {
    DateParams,
    EnergeticsBaseWorker,
    EnesaApi,
    EnesaEnergyBuildingsTransformation,
    EnesaEnergyConsumptionTransformation,
    EnesaEnergyDevicesTransformation,
} from "./";

import EnesaBuildings = EnergeticsTypes.Enesa.Buildings;
import EnesaConsumption = EnergeticsTypes.Enesa.Consumption;
import EnesaDevices = EnergeticsTypes.Enesa.Devices;

class EnergeticsEnesaWorker extends EnergeticsBaseWorker {
    private readonly datasourceEnesaEnergyBuildings: DataSourceStreamed;
    private readonly datasourceEnesaEnergyConsumption: DataSourceStreamed;
    private readonly datasourceEnesaEnergyConsumptionVisapp: DataSourceStreamed;
    private readonly datasourceEnesaEnergyDevices: DataSourceStreamed;

    private readonly transformationEnesaEnergyBuildings: EnesaEnergyBuildingsTransformation;
    private readonly transformationEnesaEnergyConsumption: EnesaEnergyConsumptionTransformation;
    private readonly transformationEnesaEnergyDevices: EnesaEnergyDevicesTransformation;

    private readonly modelEnesaEnergyBuildings: PostgresModel;
    private readonly modelEnesaEnergyConsumption: PostgresModel;
    private readonly modelEnesaEnergyDevices: PostgresModel;

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
        this.datasourceEnesaEnergyDevices = new DataSourceStreamed(
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
    }

    /**
     * Worker method - fetch data (last X days)
     */
    public fetchXDaysData = async (msg: any = 2): Promise<void> => {
        const now = moment().tz(EnesaApi.API_DATE_TZ);
        const dateFrom = now.clone().subtract(msg, "days").format(EnesaApi.API_DATE_FORMAT);
        const dateTo = now.format(EnesaApi.API_DATE_FORMAT);
        const dateParams: DateParams = {
            from: dateFrom,
            to: dateTo,
        };

        await this.fetchAndsaveData(dateParams);
    }

    /**
     * Save and refresh data in DB
     */
    private fetchAndsaveData = async (dateParams: DateParams): Promise<void> => {
        // Update connection settings
        this.datasourceEnesaEnergyBuildings.protocolStrategy.setConnectionSettings(
            this.getConnectionSettings(EnesaApi.resourceType.Buildings, dateParams),
        );

        this.datasourceEnesaEnergyConsumption.protocolStrategy.setConnectionSettings(
            this.getConnectionSettings(EnesaApi.resourceType.Consumption, dateParams),
        );

        this.datasourceEnesaEnergyConsumptionVisapp.protocolStrategy.setConnectionSettings(
            this.getConnectionSettings(EnesaApi.resourceType.ConsumptionVisapp, dateParams),
        );

        this.datasourceEnesaEnergyDevices.protocolStrategy.setConnectionSettings(
            this.getConnectionSettings(EnesaApi.resourceType.Devices, dateParams),
        );

        // Proceed and save
        const apiPromises: Array<Promise<void>> = [];

        apiPromises.push(
            this.processDataStream(
                this.datasourceEnesaEnergyBuildings.getAll(false),
                async (data: EnesaBuildings.InputElement) => {
                    const transformedData = await this.transformationEnesaEnergyBuildings.transform(data);
                    await this.modelEnesaEnergyBuildings.save(transformedData);
                },
            ),
        );

        apiPromises.push(
            this.processDataStream(
                this.datasourceEnesaEnergyConsumption.getAll(false),
                async (data: EnesaConsumption.InputElement) => {
                    const transformedData = await this.transformationEnesaEnergyConsumption.transform(data);
                    await this.modelEnesaEnergyConsumption.save(transformedData);
                },
            ),
        );

        apiPromises.push(
            this.processDataStream(
                this.datasourceEnesaEnergyConsumptionVisapp.getAll(false),
                async (data: EnesaConsumption.InputElement) => {
                    const transformedData = await this.transformationEnesaEnergyConsumption.transform(data);
                    await this.modelEnesaEnergyConsumption.save(transformedData);
                },
            ),
        );

        apiPromises.push(
            this.processDataStream(
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
     * Create and return new connection settings
     */
    private getConnectionSettings = (resourceType: string, dateParams: DateParams): IHTTPSettings => {
        const baseUrl = config.datasources.EnesaApiEnergeticsUrl;
        const params = new URLSearchParams(dateParams);

        return {
            headers: config.datasources.EnesaApiEnergeticsHeaders,
            method: "GET",
            timeout: 20000,
            url: `${baseUrl}/${resourceType}?${params}`,
        };
    }
}

export { EnergeticsEnesaWorker };
