"use strict";

import { MOS } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MosBEZonesTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MOS.BE.zones.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            coupon_id: parseInt(element.CouponID, 10),
            zone_name: element.ZoneName,
        };
        return res;
    }

}
