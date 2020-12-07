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
    VpalacMeasuringEquipmentTransformation,
} from "./";

export class EnergeticsWorker extends BaseWorker {
    private readonly vpalacMeasuringEquipmentDatasource: DataSourceStreamed;

    private readonly vpalacMeasuringEquipmentTransformation: VpalacMeasuringEquipmentTransformation;

    private readonly vpalacMeasuringEquipmentModel: PostgresModel;

    private readonly queuePrefix: string;

    constructor() {
        super();

        // =============================================================================
        // Vpalac Measuring Equipment
        // =============================================================================
        this.vpalacMeasuringEquipmentDatasource = new DataSourceStreamed(
            Energetics.vpalac.measuringEquipment.name + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "",
                url: "",
            }).setStreamTransformer(JSONStream.parse("*")),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new JSONSchemaValidator(Energetics.vpalac.measuringEquipment + "DataSource",
                Energetics.vpalac.measuringEquipment.datasourceJsonSchema));

        this.vpalacMeasuringEquipmentTransformation = new VpalacMeasuringEquipmentTransformation();

        this.vpalacMeasuringEquipmentModel = new PostgresModel(
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

        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + Energetics.name.toLowerCase();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const authCookie = await UnimonitorCemApi.getAuthCookie();

        // TODO move to separate (generic?) function
        let dataStream: DataSourceStream;
        const connectionSettings = this.getVpalacConnectionSettings(
            UnimonitorCemApi.resourceType.MeasuringEquipment,
            authCookie,
        );

        this.vpalacMeasuringEquipmentDatasource.protocolStrategy.setConnectionSettings(
            connectionSettings,
        );

        try {
            dataStream = await this.vpalacMeasuringEquipmentDatasource.getAll(false);
        } catch (err) {
            throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
        }

        try {
            await dataStream.setDataProcessor(async (data: any) => {
                const transformedData = await this.vpalacMeasuringEquipmentTransformation.transform(data);

                await this.vpalacMeasuringEquipmentModel.saveBySqlFunction(
                    transformedData,
                    ["me_id", "pot_id"],
                 );
            }).proceed();
        } catch (err) {
            throw new CustomError("Error while processing data.", true, this.constructor.name, 5051, err);
        }
    }

    /**
     * Create and return a new Vpalac datasource URL
     */
    private getVpalacConnectionSettings = (
        datasourceType: string,
        authCookie: string,
        additionalParams: Record<string, string> = {},
    ): IHTTPSettings => {
        const params = new URLSearchParams({
            id: datasourceType,
            ...additionalParams,
        });

        return {
            headers: {
                Cookie: authCookie,
            },
            method: "GET",
            timeout: 10000,
            url: `${config.datasources.UnimonitorCemapiEnergetics.url}?${params}`,
        };
    }
}
