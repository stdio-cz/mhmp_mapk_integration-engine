"use strict";

import * as JSONStream from "JSONStream";

import { CustomError } from "@golemio/errors";
import { Energetics } from "@golemio/schema-definitions";
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
    UnimonitorCemApi,
    VpalacMeasurementTransformation,
    VpalacMeasuringEquipmentTransformation,
    VpalacMeterTypeTransformation,
    VpalacTypeMeasuringEquipmentTransformation,
    VpalacUnitsTransformation,
} from "./";

type VpalacDateParams = {
    [P in "from" | "from_ms" | "to" | "to_ms"]?: string
};

export class EnergeticsWorker extends BaseWorker {
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

        // =============================================================================
        // Vpalac Measurement
        // =============================================================================
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

        // =============================================================================
        // Vpalac Measuring Equipment
        // =============================================================================
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

        // =============================================================================
        // Vpalac Meter Type
        // =============================================================================
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

        // =============================================================================
        // Vpalac Type Measuring Equipment
        // =============================================================================
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

        // =============================================================================
        // Vpalac Units
        // =============================================================================
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
     * Worker method - refresh Vpalac data (last 1 hour)
     */
    public refreshVpalac1HourData = async (msg: any): Promise<void> => {
        const dateParams: VpalacDateParams = {}; // TODO implement

        await this.saveVpalacDataToDB(dateParams);
    }

    /**
     * Worker method - refresh Vpalac data (last 14 days)
     */
    public refreshVpalac14DaysData = async (msg: any): Promise<void> => {
        const dateParams: VpalacDateParams = {}; // TODO implement

        await this.saveVpalacDataToDB(dateParams);
    }

    /**
     * Save and refresh Vpalac data in DB
     */
    private saveVpalacDataToDB = async (dateParams: VpalacDateParams): Promise<void> => {
        const { authCookie } = await UnimonitorCemApi.createSession();

        // Measuring Equipment - update connection settings
        this.datasourceVpalacMeasuringEquipment.protocolStrategy.setConnectionSettings(
            this.getVpalacConnectionSettings(
                UnimonitorCemApi.resourceType.MeasuringEquipment,
                authCookie,
                dateParams,
            ),
        );

        // Measuring Equipment - proceed and save
        await this.proceedVpalacDataStream(
            this.datasourceVpalacMeasuringEquipment.getAll(false),
            async (data: any) => {
                const transformedData = await this.transformationVpalacMeasuringEquipment.transform(data);

                await this.modelVpalacMeasuringEquipment.saveBySqlFunction(
                    transformedData,
                    ["me_id", "pot_id"],
                );
            },
        );

        // Terminate API session
        await UnimonitorCemApi.terminateSession(authCookie);
    }

    /**
     * Proceed Vpalac data stream (generic)
     */
    private proceedVpalacDataStream = async (
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
     * Create and return a new Vpalac datasource URL
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
            url: `${config.datasources.UnimonitorCemapiEnergetics.url}?${params}`,
        };
    }
}
