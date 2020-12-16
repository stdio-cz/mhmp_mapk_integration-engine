"use strict";

import * as JSONStream from "JSONStream";
import * as moment from "moment";

import { Energetics } from "@golemio/schema-definitions";
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
    UnimonitorCemApi,
    VpalacMeasurementTransformation,
    VpalacMeasuringEquipmentTransformation,
    VpalacMeterTypeTransformation,
    VpalacTypeMeasuringEquipmentTransformation,
    VpalacUnitsTransformation,
} from "./";

class EnergeticsVpalacWorker extends EnergeticsBaseWorker {
    private readonly datasourceVpalacMeasurement: DataSourceStreamed;
    private readonly datasourceVpalacMeasuringEquipment: DataSourceStreamed;
    private readonly datasourceVpalacMeterType: DataSourceStreamed;
    private readonly datasourceVpalacTypeMeasuringEquipment: DataSourceStreamed;
    private readonly datasourceVpalacUnits: DataSourceStreamed;

    private readonly transformationVpalacMeasurement: VpalacMeasurementTransformation;
    private readonly transformationVpalacMeasuringEquipment: VpalacMeasuringEquipmentTransformation;
    private readonly transformationVpalacMeterType: VpalacMeterTypeTransformation;
    private readonly transformationVpalacTypeMeasuringEquipment: VpalacTypeMeasuringEquipmentTransformation;
    private readonly transformationVpalacUnits: VpalacUnitsTransformation;

    private readonly modelVpalacMeasurement: PostgresModel;
    private readonly modelVpalacMeasuringEquipment: PostgresModel;
    private readonly modelVpalacMeterType: PostgresModel;
    private readonly modelVpalacTypeMeasuringEquipment: PostgresModel;
    private readonly modelVpalacUnits: PostgresModel;

    constructor() {
        super();

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
     * Worker method - fetch data (last 14 days)
     */
    public fetch14DaysData = async (msg: any): Promise<void> => {
        const now = moment().tz(UnimonitorCemApi.API_DATE_TZ);
        const dateFrom = now.clone().subtract(14, "days").format(UnimonitorCemApi.API_DATE_FORMAT);
        const dateTo = now.format(UnimonitorCemApi.API_DATE_FORMAT);
        const dateParams: DateParams = {
            from: dateFrom,
            to: dateTo,
        };

        await this.saveDataToDB(dateParams);
    }

    /**
     * Worker method - fetch data (last 1 hour)
     */
    public fetch1HourData = async (msg: any): Promise<void> => {
        const now = moment().tz(UnimonitorCemApi.API_DATE_TZ);
        const timeFrom = now.clone().subtract(1, "hour").valueOf().toString();
        const timeTo = now.valueOf().toString();
        const dateParams: DateParams = {
            from_ms: timeFrom,
            to_ms: timeTo,
        };

        await this.saveDataToDB(dateParams);
    }

    /**
     * Save and refresh data in DB
     */
    private saveDataToDB = async (dateParams: DateParams): Promise<void> => {
        const { authCookie } = await UnimonitorCemApi.createSession();

        // Update connection settings
        this.datasourceVpalacMeasurement.protocolStrategy.setConnectionSettings(
            this.getConnectionSettings(
                UnimonitorCemApi.resourceType.Measurement,
                authCookie,
                dateParams,
            ),
        );

        this.datasourceVpalacMeasuringEquipment.protocolStrategy.setConnectionSettings(
            this.getConnectionSettings(
                UnimonitorCemApi.resourceType.MeasuringEquipment,
                authCookie,
                dateParams,
            ),
        );

        this.datasourceVpalacMeterType.protocolStrategy.setConnectionSettings(
            this.getConnectionSettings(
                UnimonitorCemApi.resourceType.MeterType,
                authCookie,
                dateParams,
            ),
        );

        this.datasourceVpalacTypeMeasuringEquipment.protocolStrategy.setConnectionSettings(
            this.getConnectionSettings(
                UnimonitorCemApi.resourceType.TypeMeasuringEquipment,
                authCookie,
                {
                    cis: "135",
                    ...dateParams,
                },
            ),
        );

        this.datasourceVpalacUnits.protocolStrategy.setConnectionSettings(
            this.getConnectionSettings(
                UnimonitorCemApi.resourceType.Units,
                authCookie,
                dateParams,
            ),
        );

        // Proceed and save
        const apiPromises: Array<Promise<void>> = [];

        apiPromises.push(
            this.processDataStream(
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
            this.processDataStream(
                this.datasourceVpalacMeasuringEquipment.getAll(false),
                async (data: any) => {
                    const transformedData = await this.transformationVpalacMeasuringEquipment.transform(data);
                    await this.modelVpalacMeasuringEquipment.save(transformedData);
                },
            ),
        );

        apiPromises.push(
            this.processDataStream(
                this.datasourceVpalacMeterType.getAll(false),
                async (data: any) => {
                    const transformedData = await this.transformationVpalacMeterType.transform(data);
                    await this.modelVpalacMeterType.save(transformedData);
                },
            ),
        );

        apiPromises.push(
            this.processDataStream(
                this.datasourceVpalacTypeMeasuringEquipment.getAll(false),
                async (data: any) => {
                    const transformedData = await this.transformationVpalacTypeMeasuringEquipment.transform(data);
                    await this.modelVpalacTypeMeasuringEquipment.save(transformedData);
                },
            ),
        );

        apiPromises.push(
            this.processDataStream(
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
     * Create and return new connection settings
     */
    private getConnectionSettings = (
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

export { EnergeticsVpalacWorker };
