"use strict";

import { MOS } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import {
    MosBEAccountsTransformation,
    MosBECouponsTransformation,
    MosBECustomersTransformation,
    MosBEZonesTransformation,
} from "./";

export class MosBEWorker extends BaseWorker {

    private accountsModel: PostgresModel;
    private couponsModel: PostgresModel;
    private customersModel: PostgresModel;
    private zonesModel: PostgresModel;
    private accountsTransformation: MosBEAccountsTransformation;
    private couponsTransformation: MosBECouponsTransformation;
    private customersTransformation: MosBECustomersTransformation;
    private zonesTransformation: MosBEZonesTransformation;

    constructor() {
        super();
        this.accountsModel = new PostgresModel(MOS.BE.accounts.name + "Model", {
                outputSequelizeAttributes: MOS.BE.accounts.outputSequelizeAttributes,
                pgTableName: MOS.BE.accounts.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(MOS.BE.accounts.name + "ModelValidator",
                MOS.BE.accounts.outputMongooseSchemaObject),
        );
        this.couponsModel = new PostgresModel(MOS.BE.coupons.name + "Model", {
                outputSequelizeAttributes: MOS.BE.coupons.outputSequelizeAttributes,
                pgTableName: MOS.BE.coupons.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(MOS.BE.coupons.name + "ModelValidator",
                MOS.BE.coupons.outputMongooseSchemaObject),
        );
        this.customersModel = new PostgresModel(MOS.BE.customers.name + "Model", {
                outputSequelizeAttributes: MOS.BE.customers.outputSequelizeAttributes,
                pgTableName: MOS.BE.customers.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(MOS.BE.customers.name + "ModelValidator",
                MOS.BE.customers.outputMongooseSchemaObject),
        );
        this.zonesModel = new PostgresModel(MOS.BE.zones.name + "Model", {
                outputSequelizeAttributes: MOS.BE.zones.outputSequelizeAttributes,
                pgTableName: MOS.BE.zones.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(MOS.BE.zones.name + "ModelValidator",
                MOS.BE.zones.outputMongooseSchemaObject),
        );
        this.accountsTransformation = new MosBEAccountsTransformation();
        this.couponsTransformation = new MosBECouponsTransformation();
        this.customersTransformation = new MosBECustomersTransformation();
        this.zonesTransformation = new MosBEZonesTransformation();
    }

    public saveAccountsDataToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.accountsTransformation.transform(inputData);
        await this.accountsModel.saveBySqlFunction(transformedData, [ "day" ]);
    }

    public saveCouponsDataToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.couponsTransformation.transform(inputData);
        await this.couponsModel.saveBySqlFunction(transformedData, [ "coupon_id" ]);
    }

    public saveCustomersDataToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.customersTransformation.transform(inputData);
        await this.customersModel.saveBySqlFunction(transformedData, [ "customer_id" ]);
    }

    public saveZonesDataToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.zonesTransformation.transform(inputData);
        await this.zonesModel.saveBySqlFunction(transformedData, [ "coupon_id", "zone_name" ]);
    }

}
