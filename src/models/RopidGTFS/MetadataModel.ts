"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import log from "../../helpers/Logger";
import Validator from "../../helpers/Validator";
import IModel from "../IModel";
import PostgresModel from "../PostgresModel";

const { PostgresConnector } = require("../../helpers/PostgresConnector");

export default class MetadataModel extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = RopidGTFS.metadata.name;

        this.sequelizeModel = PostgresConnector.getConnection().define(RopidGTFS.metadata.tmpPgTableName,
            RopidGTFS.metadata.outputSequelizeAttributes);
        // TODO doplnit validator
        this.validator = null; // new Validator(this.name, schemaObject);
    }

    public getLastModified = async (): Promise<string|null> => {
        const connection = PostgresConnector.getConnection();
        try {
            const lastMod = await connection.query(
                "SELECT * "
                + "FROM " + RopidGTFS.metadata.pgTableName + " "
                + "WHERE key = 'last_modified' AND type = 'DATASET_INFO';",
                { type: connection.QueryTypes.SELECT });
            return lastMod[0].value;
        } catch (err) {
            log.warn(err);
            return null;
        }
    }

    public checkSavedRowsAndReplaceTables = async (): Promise<boolean> => {
        const metaSum = await this.getTotalFromMeta();
        const tableSum = await this.getTotalFromTables();
        if (metaSum === tableSum) {
            const connection = PostgresConnector.getConnection();
            const t = await connection.transaction();
            try {
                const tables = await connection.query(
                    "SELECT key as tn "
                    + "FROM " + RopidGTFS.metadata.tmpPgTableName + " "
                    + "WHERE type = 'TABLE_TOTAL_COUNT';",
                    { type: connection.QueryTypes.SELECT, transaction: t });
                const promises = tables.map((table) => {
                    const tableName = RopidGTFS[table.tn].pgTableName;
                    const tmpTableName = RopidGTFS[table.tn].tmpPgTableName;
                    return connection.query(
                        "ALTER TABLE IF EXISTS " + tableName + " RENAME TO old_" + tableName + "; "
                        + "ALTER TABLE IF EXISTS " + tmpTableName + " RENAME TO " + tableName + "; "
                        + "DROP TABLE IF EXISTS old_" + tableName + "; ",
                        { transaction: t });
                });
                await Promise.all(promises);
                const metaTableName = RopidGTFS.metadata.pgTableName;
                const metaTmpTableName = RopidGTFS.metadata.tmpPgTableName;
                await connection.query(
                        "ALTER TABLE IF EXISTS " + metaTableName + " RENAME TO old_" + metaTableName + "; "
                        + "ALTER TABLE IF EXISTS " + metaTmpTableName + " RENAME TO " + metaTableName + "; "
                        + "DROP TABLE IF EXISTS old_" + metaTableName + ";",
                        { transaction: t });
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

    private getTotalFromMeta = async (): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        let result = await connection.query(
            "SELECT sum(CAST (value as INTEGER)) as total "
            + "FROM " + RopidGTFS.metadata.tmpPgTableName + " "
            + "WHERE type = 'TABLE_TOTAL_COUNT';",
            { type: Sequelize.QueryTypes.SELECT });
        result = result[0].total;
        log.debug(this.name + " Total from metadata: " + result);
        return result;
    }

    private getTotalFromTables = async (): Promise<any> => {
        const connection = PostgresConnector.getConnection();

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

        let result = await connection.query(
            "SELECT SUM(count_rows(table_schema, table_name)) as total "
            + "FROM information_schema.tables "
            + "WHERE "
            + "table_schema NOT IN ('pg_catalog', 'information_schema') "
            + "AND table_type = 'BASE TABLE' "
            + "AND table_name like ('" + RopidGTFS.metadata.tmpPgTableName.replace("metadata", "") + "%') "
            + "AND table_name <> '" + RopidGTFS.metadata.tmpPgTableName + "' ",
            { type: Sequelize.QueryTypes.SELECT});
        result = result[0].total;
        log.debug(this.name + " Total from tables: " + result);
        return result;
    }

}
