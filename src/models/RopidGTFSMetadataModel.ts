"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
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

    public checkSavedRowsAndReplaceTables = async (dataset: string, version: number): Promise<boolean> => {
        const metaSum = await this.getTotalFromMeta(dataset, version);
        const tableSum = await this.getTotalFromTables(dataset, version);
        if (metaSum === tableSum) {
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
                        version: { [Sequelize.Op.ne]: version },
                    },
                });
                t.commit();
                return true;
            } catch (err) {
                log.error(err);
                t.rollback();
                return false;
            }
        }
        return false;
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

        await connection.query(
            "CREATE OR REPLACE FUNCTION "
            + "count_rows(schema text, tablename text) RETURNS integer as "
            + "$body$ "
            + "DECLARE "
            + "result integer; "
            + "query varchar; "
            + "BEGIN "
            + "query := 'SELECT count(1) FROM ' || schema || '.' || tablename; "
            + "execute query into result; "
            + "return result; "
            + "END; "
            + "$body$ "
            + "LANGUAGE plpgsql; ", { type: Sequelize.QueryTypes.SELECT});

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
