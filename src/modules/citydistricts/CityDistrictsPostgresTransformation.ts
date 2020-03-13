"use strict";

import { CityDistricts } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class CityDistrictsPostgresTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = CityDistricts.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        return {
            area: element.properties.PLOCHA,
            change_date: element.properties.DAT_ZMENA,
            change_status: element.properties.STAV_ZMENA,
            create_date: element.properties.DAT_VZNIK,
            district_name: element.properties.NAZEV_MC,
            district_short_name: element.properties.NAZEV_1,
            geom: element.geometry,
            id: element.properties.ID,
            id_provider: element.properties.ID_POSKYT,
            kod_mo: element.properties.KOD_MO,
            kod_so: element.properties.KOD_SO,
            objectid: element.properties.OBJECTID,
            provider: element.properties.POSKYT,
            shape_area: element.properties.Shape_Area,
            shape_length: element.properties.Shape_Length,
            tid_tmmestckecasti_p: element.properties.TID_TMMESTSKECASTI_P,
            zip: element.properties.KOD_MC,
        };
    }

}
