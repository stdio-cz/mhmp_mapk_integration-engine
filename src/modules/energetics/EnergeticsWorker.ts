"use strict";

import { Energetics } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { BaseWorker } from "../../core/workers";

enum VpalacDatasouceType {
    MeasuringEquipment = "6",
    TypeMeasuringEquipment = "11",
    Units = "7",
    MeterType = "14",
    Measurement = "20",
}

export class EnergeticsWorker extends BaseWorker {
    private readonly dataSourceVpalacMeasuringEquipment: DataSource;
    private readonly queuePrefix: string;

    constructor() {
        super();

        this.dataSourceVpalacMeasuringEquipment = new DataSource(
            Energetics.vpalac.measuringEquipment.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: this.constructVpalacDatasourceUrl(VpalacDatasouceType.MeasuringEquipment),
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            new Validator(Energetics.vpalac.measuringEquipment + "DataSource",
                Energetics.vpalac.measuringEquipment.datasourceMongooseSchemaObject));

        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + Energetics.name.toLowerCase();
    }

    /**
     * Construct new Vpalac datasource URL
     */
    private constructVpalacDatasourceUrl = (
        datasourceType: VpalacDatasouceType,
        additionalParams: Record<string, string> = {},
    ): string => {
        const params = new URLSearchParams({
            id: datasourceType,
            ...additionalParams,
        });

        return `${config.datasources.UnimonitorCemapiEnergetics}?${params}`;
    }
}
