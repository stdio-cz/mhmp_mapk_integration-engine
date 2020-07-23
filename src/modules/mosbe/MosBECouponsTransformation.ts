"use strict";

import { MOS } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MosBECouponsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MOS.BE.coupons.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            coupon_custom_status_id: (element.CouponCustomStatusID && element.CouponCustomStatusID !== "")
                ? parseInt(element.CouponCustomStatusID, 10)
                : null,
            coupon_id: parseInt(element.couponID, 10),
            created: element.Created,
            created_by_id: (element.CreatedByID && element.CreatedByID !== "")
                ? element.CreatedByID
                : null,
            customer_id: (element.customerid && element.customerid !== "")
                ? parseInt(element.customerid, 10)
                : null,
            customer_profile_name: (element.CustomerProfileName && element.CustomerProfileName !== "")
                ? element.CustomerProfileName
                : null,
            description: (element.Description && element.Description !== "")
                ? element.Description
                : null,
            order_payment_type: (element.OrderPaymentType && element.OrderPaymentType !== "")
                ? parseInt(element.OrderPaymentType, 10)
                : null,
            order_status: (element.OrderStatus && element.OrderStatus !== "")
                ? parseInt(element.OrderStatus, 10)
                : null,
            price: parseFloat(element.Price),
            seller_id: (element.SellerID && element.SellerID !== "")
                ? parseInt(element.SellerID, 10)
                : null,
            tariff_id: parseInt(element.tariffID, 10),
            tariff_int_name: element.TariffIntName,
            tariff_name: element.TariffName,
            tariff_profile_name: element.TariffProfileName,
            token_id: (element.TokenID && element.TokenID !== "")
                ? element.TokenID
                : null,
            valid_from: element.ValidFrom,
            valid_till: element.ValidTill,
        };
        return res;
    }

}
