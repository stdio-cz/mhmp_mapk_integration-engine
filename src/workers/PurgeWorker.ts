"use strict";

import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";

const { PostgresConnector } = require("../helpers/PostgresConnector");

export default class PurgeWorker {

    public deleteOldVehiclePositions = async (msg: any): Promise<void> => {
        try {
            let res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('vehiclepositions_trips','created',48);",
            );
            log.debug(res);
            res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('vehiclepositions_stops','created',48);",
            );
            log.debug(res);
            res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('vehiclepositions_positions','created',48);",
            );
            log.debug(res);
        } catch (err) {
            throw new CustomError("Error while purging old data.", true, this.constructor.name, 1017, err);
        }
    }

    public deleteOldMerakiAccessPointsObservations = async (msg: any): Promise<void> => {
        try {
            const res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('merakiaccesspoints_observations','timestamp',168);",
            );
            log.debug(res);
        } catch (err) {
            throw new CustomError("Error while purging old data.", true, this.constructor.name, 1017, err);
        }
    }

}
