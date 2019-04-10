"use strict";

import { log, PostgresConnector } from "../../core/helpers";
import { CustomError } from "../../core/helpers/errors";

export class PurgeWorker {

    public deleteOldVehiclePositions = async (msg: any): Promise<void> => {
        try {
            let res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('vehiclepositions_trips','created_at',48);",
            );
            log.debug(res);
            res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('vehiclepositions_stops','created_at',48);",
            );
            log.debug(res);
            res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('vehiclepositions_positions','created_at',48);",
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
