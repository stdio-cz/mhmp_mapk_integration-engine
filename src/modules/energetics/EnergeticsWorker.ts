"use strict";

import { Energetics } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";

import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { UnimonitorCemApi } from "../../core/helpers";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { VpalacMeasuringEquipmentTransformation } from "./";

export class EnergeticsWorker extends BaseWorker {
    private readonly dataSourceVpalacMeasuringEquipment: DataSource;

    private vpalacMeasuringEquipmentTransformation: VpalacMeasuringEquipmentTransformation;

    private vpalacMeasuringEquipmentModel: PostgresModel;

    private readonly queuePrefix: string;

    constructor() {
        super();

        this.dataSourceVpalacMeasuringEquipment = new DataSource(
            Energetics.vpalac.measuringEquipment.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: this.getVpalacDatasourceUrl(UnimonitorCemApi.resourceType.MeasuringEquipment),
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(Energetics.vpalac.measuringEquipment + "DataSource",
                Energetics.vpalac.measuringEquipment.datasourceMongooseSchemaObject));

        this.vpalacMeasuringEquipmentTransformation = new VpalacMeasuringEquipmentTransformation();

        this.vpalacMeasuringEquipmentModel = new PostgresModel(
            Energetics.vpalac.measuringEquipment.name + "Model",
            {
                outputSequelizeAttributes: Energetics.vpalac.measuringEquipment.outputSequelizeAttributes,
                pgTableName: Energetics.vpalac.measuringEquipment.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(
                Energetics.vpalac.measuringEquipment.name + "ModelValidator",
                Energetics.vpalac.measuringEquipment.outputMongooseSchemaObject,
            ),
        );

        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + Energetics.name.toLowerCase();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const authCookie = await UnimonitorCemApi.getAuthCookie();

        // TODO inject custom headers here
        const data = await this.dataSourceVpalacMeasuringEquipment.getAll();
    }

    /**
     * Create and return a new Vpalac datasource URL
     */
    private getVpalacDatasourceUrl = (
        datasourceType: string,
        additionalParams: Record<string, string> = {},
    ): string => {
        const params = new URLSearchParams({
            id: datasourceType,
            ...additionalParams,
        });

        return `${config.datasources.UnimonitorCemapiEnergetics}?${params}`;
    }
}
