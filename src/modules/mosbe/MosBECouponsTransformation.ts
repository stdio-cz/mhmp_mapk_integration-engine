"use strict";

import { MOS } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MosBECouponsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MOS.BE.coupons.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            coupon_custom_status_id: parseInt(element.CouponCustomStatusID, 10),
            coupon_id: parseInt(element.couponID, 10),
            created: element.Created,
            customer_id: parseInt(element.customerid, 10),
            customer_profile_name: element.CustomerProfileName,
            description: element.Description,
            price: parseFloat(element.Price),
            seller_id: parseInt(element.SellerID, 10),
            tariff_id: parseInt(element.tariffID, 10),
            tariff_int_name: element.TariffIntName,
            tariff_name: element.TariffName,
            tariff_profile_name: element.TariffProfileName,
            valid_from: element.ValidFrom,
            valid_till: element.ValidTill,
        };
        return res;
    }

}
