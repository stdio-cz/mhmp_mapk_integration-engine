"use strict";

import { CustomError } from "@golemio/errors";
import { RopidGTFS } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as Sequelize from "sequelize";
import { PostgresConnector } from "../../core/connectors";
import { log } from "../../core/helpers";
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
            new Validator(RopidGTFS.metadata.name + "ModelValidator",
                RopidGTFS.metadata.outputMongooseSchemaObject),
        );
    }

    public getLastModified = async (dataset: string): Promise<any | null> => {
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
                version: (lastMod.dataValues) ? parseInt(lastMod.dataValues.version, 10) : 1,
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
        const meta = await this.getTotalFromMeta(dataset, version);
        const tables = await this.getTotalFromTables(dataset, version);
        if (meta.totalRows !== tables.totalRows
            || meta.numOfTables !== tables.numOfTables) {
            throw new CustomError(this.name + ": checkSavedRows() failed.", true);
        }
    }

    public checkAllTablesHasSavedState = async (dataset: string, version: number): Promise<boolean> => {
        const notSaved = await this.sequelizeModel.count({
            where: {
                dataset,
                type: "STATE",
                value: { [Sequelize.Op.ne]: "SAVED" },
                version,
            },
        });
        return (notSaved === 0) ? true : false;
    }

    public checkIfNewVersionIsAlreadyDeployed = async (dataset: string, version: number): Promise<boolean> => {
        const alreadyDeployed = await this.sequelizeModel.count({
            where: {
                dataset,
                key: "deployed",
                type: "DATASET_INFO",
                value: "true",
                version,
            },
        });
        return (alreadyDeployed === 0) ? false : true;
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
                    "DELETE FROM " + tableName + "; "
                    + "INSERT INTO " + tableName + " SELECT " + columnsString + " FROM " + tmpTableName + "; "
                    + "DROP TABLE IF EXISTS " + tmpTableName + "; ",
                    { type: Sequelize.QueryTypes.SELECT, transaction: t });
            });
            await Promise.all(promises);
            await this.sequelizeModel.destroy({
                transaction: t,
                where: {
                    dataset,
                    version: {
                        [Sequelize.Op.and]: [
                            { [Sequelize.Op.ne]: version },
                            { [Sequelize.Op.ne]: -1 },
                        ],
                    },
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
                version: {
                    [Sequelize.Op.and]: [
                        { [Sequelize.Op.eq]: version },
                        { [Sequelize.Op.ne]: -1 },
                    ],
                },
            },
        });
        await this.save({
            dataset,
            key: "failed",
            type: "DATASET_INFO",
            value: new Date().toISOString(),
            version: -1,
        });
        t.commit();
    }

    public updateState = async (dataset: string, name: string, state: string, version: number): Promise<any> => {
        return this.sequelizeModel.update({
            dataset,
            key: name,
            type: "STATE",
            value: state,
            version,
        }, {
            where: {
                dataset,
                key: name,
                type: "STATE",
                version,
            },
        });
    }

    public updateSavedRows = async (dataset: string, name: string, count: number, version: number): Promise<any> => {
        const connection = PostgresConnector.getConnection();

        const result = await connection.query(
            "SELECT SUM(count_rows(table_schema, table_name)) as total "
            + "FROM information_schema.tables "
            + "WHERE "
            + "table_schema NOT IN ('pg_catalog', 'information_schema') "
            + "AND table_type = 'BASE TABLE' "
            + "AND table_name = '" + RopidGTFS[name].pgTableName + "' "
            + "AND table_schema = 'tmp'; ",
            { type: Sequelize.QueryTypes.SELECT });

        const metaRow = await this.sequelizeModel.findOne({
            where: {
                dataset,
                key: name,
                type: "SAVED_ROWS",
                version,
            },
        });

        if (!metaRow) {
            await this.save({
                dataset,
                key: name,
                type: "SAVED_ROWS",
                value: result[0].total,
                version,
            });
        } else {
            await this.sequelizeModel.update({
                dataset,
                key: name,
                type: "SAVED_ROWS",
                value: result[0].total,
                version,
            }, {
                where: {
                    dataset,
                    key: name,
                    type: "SAVED_ROWS",
                    version,
                },
            });
        }

        const total = await this.sequelizeModel.findOne({
            where: {
                dataset,
                key: name,
                type: "TABLE_TOTAL_COUNT",
                version,
            },
        });

        if (total && total.dataValues && parseInt(total.dataValues.value, 10) === parseInt(result[0].total, 10)) {
            await this.sequelizeModel.update({
                dataset,
                key: name,
                type: "STATE",
                value: "SAVED",
                version,
            }, {
                where: {
                    dataset,
                    key: name,
                    type: "STATE",
                    version,
                },
            });
        }
    }

    public refreshMaterializedViews = async (): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        return connection.query(
            `REFRESH MATERIALIZED VIEW "public"."v_ropidgtfs_services_first14days"`,
            { type: Sequelize.QueryTypes.SELECT });
    }

    private getTotalFromMeta = async (dataset: string, version: number): Promise<any> => {
        const tables = await this.sequelizeModel.findAll({
            attributes: [["key", "tn"]],
            where: {
                dataset,
                type: "TABLE_TOTAL_COUNT",
                version,
            },
        });
        const result = await this.sequelizeModel.findAll({
            attributes: [[Sequelize.fn("SUM", Sequelize.cast(Sequelize.col("value"), "INTEGER")), "total"]],
            where: {
                dataset,
                type: "TABLE_TOTAL_COUNT",
                version,
            },
        });
        const res = {
            numOfTables: tables.length,
            totalRows: result[0].dataValues.total,
        };
        log.debug(this.name + " Total from metadata: " + JSON.stringify(res));
        return res;
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
            { type: Sequelize.QueryTypes.SELECT });

        const res = {
            numOfTables: tables.length,
            totalRows: result[0].total,
        };
        log.debug(this.name + " Total from tables: " + JSON.stringify(res));
        return res;
    }

}
