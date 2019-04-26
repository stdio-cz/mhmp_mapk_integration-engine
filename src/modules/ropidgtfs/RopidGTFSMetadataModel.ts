"use strict";

import { RopidGTFS } from "golemio-schema-definitions";
import * as Sequelize from "sequelize";
import { PostgresConnector } from "../../core/connectors";
import { log, Validator } from "../../core/helpers";
import { CustomError } from "../../core/helpers/errors";
import { IModel, PostgresModel } from "../../core/models";

export class RopidGTFSMetadataModel extends PostgresModel implements IModel {

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

            const promises = tables.map(async (table) => {
                const tableName = "public." + RopidGTFS[table.dataValues.tn].pgTableName;
                const tmpTableName = "tmp." + RopidGTFS[table.dataValues.tn].pgTableName;
                const oldTableName = "tmp.old_" + RopidGTFS[table.dataValues.tn].pgTableName;

                // getting table columns and joining them into string for the INSERT SELECT command
                // it's because the "star" from "INSERT INTO table SELECT * FROM other_table" not working
                const columns = await connection.query(
                    "SELECT column_name "
                    + "FROM information_schema.columns "
                    + "WHERE table_schema = 'public' "
                    + "AND table_name = '" + RopidGTFS[table.dataValues.tn].pgTableName + "'; ",
                    { type: Sequelize.QueryTypes.SELECT });
                const columnsString = columns.map((c) => '"' + c.column_name + '"').join(", ");

                return connection.query(
                    "CREATE TABLE IF NOT EXISTS " + oldTableName + " (LIKE " + tableName + " INCLUDING ALL); "
                    + "TRUNCATE TABLE " + oldTableName + "; "
                    + "INSERT INTO " + oldTableName + " SELECT " + columnsString + " FROM " + tableName + "; "
                    + "TRUNCATE TABLE " + tableName + "; "
                    + "INSERT INTO " + tableName + " SELECT " + columnsString + " FROM " + tmpTableName + "; "
                    + "DROP TABLE IF EXISTS " + tmpTableName + "; "
                    + "DROP TABLE IF EXISTS " + oldTableName + "; ",
                    { type: Sequelize.QueryTypes.SELECT, transaction: t });
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
            tablesArray.push("'" + RopidGTFS[table.dataValues.tn].pgTableName + "'");
        });

        // TODO zbavit se raw query
        const result = await connection.query(
            "SELECT SUM(count_rows(table_schema, table_name)) as total "
            + "FROM information_schema.tables "
            + "WHERE "
            + "table_schema NOT IN ('pg_catalog', 'information_schema') "
            + "AND table_type = 'BASE TABLE' "
            + "AND table_name in (" + tablesArray.join(",") + ") "
            + "AND table_schema = 'tmp'; ",
            { type: Sequelize.QueryTypes.SELECT});

        log.debug(this.name + " Total from tables: " + result[0].total);
        return result[0].total;
    }

}
