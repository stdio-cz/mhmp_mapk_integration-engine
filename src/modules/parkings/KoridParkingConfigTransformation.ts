"use strict";

import { Parkings } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class KoridParkingConfigTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Parkings.korid.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            capacity: Number(element.gpreservation.zoneinfo.zonei.capacity),
            occupation: Number(element.gpreservation.zoneinfo.zonei.occupation),
            parking_id: element.gpreservation.zoneinfo.zonei.parking_id,
            reservedcapacity: Number(element.gpreservation.zoneinfo.zonei.reservedcapacity),
            reservedoccupation: Number(element.gpreservation.zoneinfo.zonei.reservedoccupation),
        };
        return res;
    }

}
