"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";
import Validator from "../helpers/Validator";
import { IModel } from "./IModel";
import PostgresModel from "./PostgresModel";

const { PostgresConnector } = require("../helpers/PostgresConnector");

export default class RopidGTFSMetadataModel extends PostgresModel implements IModel {

    /** Model name */
    public name: string;
    /** The Sequelize Model */
    protected sequelizeModel: Sequelize.Model<any, any>;
    /** The Sequelize Model for temporary table */
    protected tmpSequelizeModel: Sequelize.Model<any, any> | null;
    /** Validation helper */
    protected validator: Validator;
    /** Type/Strategy of saving the data */
    protected savingType: "insertOnly" | "insertOrUpdate";

    constructor() {
        super(RopidGTFS.metadata.name + "Model", {
                outputSequelizeAttributes: RopidGTFS.metadata.outputSequelizeAttributes,
                pgTableName: RopidGTFS.metadata.pgTableName,
                savingType: "insertOnly",
            },
            null,
        );
    }

    public getLastModified = async (dataset: string): Promise<any|null> => {
        try {
            const lastMod = await this.sequelizeModel.findOne({
                order: [["version", "DESC"]],
                where: {
                    dataset,
                    key: "last_modified",
                    type: "DATASET_INFO",
                },
            });
            return (lastMod) ? {
                    lastModified: (lastMod.dataValues) ? lastMod.dataValues.value : null,
                    version: (lastMod.dataValues) ? lastMod.dataValues.version : 1,
                } : {
                    lastModified: null,
                    version: 0,
                };
        } catch (err) {
            log.warn(err);
            return {
                lastModified: null,
                version: 0,
            };
        }
    }

    public checkSavedRows = async (dataset: string, version: number): Promise<void> => {
        const metaSum = await this.getTotalFromMeta(dataset, version);
        const tableSum = await this.getTotalFromTables(dataset, version);
        if (metaSum !== tableSum) {
            throw new CustomError(this.name + ": checkSavedRows() failed.", true);
        }
    }

    public replaceTables = async (dataset: string, version: number): Promise<boolean> => {
        const connection = PostgresConnector.getConnection();
        const t = await connection.transaction();
        try {
            const tables = await this.sequelizeModel.findAll({
                attributes: [["key", "tn"]],
                transaction: t,
                where: {
                    dataset,
                    type: "TABLE_TOTAL_COUNT",
                    version,
                },
            });
            const promises = tables.map((table) => {
                const tableName = RopidGTFS[table.dataValues.tn].pgTableName;
                const tmpTableName = RopidGTFS[table.dataValues.tn].tmpPgTableName;
                return connection.query(
                    "ALTER TABLE IF EXISTS " + tableName + " RENAME TO old_" + tableName + "; "
                    + "ALTER TABLE IF EXISTS " + tmpTableName + " RENAME TO " + tableName + "; "
                    + "DROP TABLE IF EXISTS old_" + tableName + "; ",
                    { transaction: t });
            });
            await Promise.all(promises);
            await this.sequelizeModel.destroy({
                transaction: t,
                where: {
                    dataset,
                    version: { [Sequelize.Op.and]: [
                        { [Sequelize.Op.ne]: version },
                        { [Sequelize.Op.ne]: -1 },
                    ]},
                },
            });
            t.commit();
            return true;
        } catch (err) {
            log.error(err);
            t.rollback();
            throw new CustomError(this.name + ": replaceTables() failed.", true, null, null, err);
        }
    }

    public rollbackFailedSaving = async (dataset: string, version: number): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        const t = await connection.transaction();
        await this.sequelizeModel.destroy({
            transaction: t,
            where: {
                dataset,
                version: { [Sequelize.Op.and]: [
                    { [Sequelize.Op.eq]: version },
                    { [Sequelize.Op.ne]: -1 },
                ]},
            },
        });
        await this.save({
            dataset,
            key: "failed",
            type: "DATASET_INFO",
            value: new Date().toISOString(),
            version: -1 });
        t.commit();
    }

    private getTotalFromMeta = async (dataset: string, version: number): Promise<any> => {
        const result = await this.sequelizeModel.findAll({
            attributes: [[Sequelize.fn("SUM", Sequelize.cast(Sequelize.col("value"), "INTEGER")), "total"]],
            where: {
                dataset,
                type: "TABLE_TOTAL_COUNT",
                version,
            },
        });
        log.debug(this.name + " Total from metadata: " + result[0].dataValues.total);
        return result[0].dataValues.total;
    }

    private getTotalFromTables = async (dataset: string, version: number): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        const tables = await this.sequelizeModel.findAll({
            attributes: [["key", "tn"]],
            where: {
                dataset,
                type: "TABLE_TOTAL_COUNT",
                version,
            },
        });
        const tablesArray = [];
        tables.map((table) => {
            tablesArray.push("'" + RopidGTFS[table.dataValues.tn].tmpPgTableName + "'");
        });

        // TODO zbavit se raw query
        const result = await connection.query(
            "SELECT SUM(count_rows(table_schema, table_name)) as total "
            + "FROM information_schema.tables "
            + "WHERE "
            + "table_schema NOT IN ('pg_catalog', 'information_schema') "
            + "AND table_type = 'BASE TABLE' "
            + "AND table_name in (" + tablesArray.join(",") + "); ",
            { type: Sequelize.QueryTypes.SELECT});

        log.debug(this.name + " Total from tables: " + result[0].total);
        return result[0].total;
    }

}
