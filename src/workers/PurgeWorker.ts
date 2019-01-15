"use strict";

import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";

const { PostgresConnector } = require("../helpers/PostgresConnector");

export default class PurgeWorker {

    public deleteOldVehiclePositionsTrips = async (): Promise<void> => {
        try {
            const res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('vehiclepositions_trips','created',48);",
            );
            log.debug(res);
        } catch (err) {
            throw new CustomError("Error while purging old data.", true, this.constructor.name, 1017, err);
        }
    }

    public deleteOldVehiclePositionsStops = async (): Promise<void> => {
        try {
            const res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('vehiclepositions_stops','created',48);",
            );
            log.debug(res);
        } catch (err) {
            throw new CustomError("Error while purging old data.", true, this.constructor.name, 1017, err);
        }
    }

    public deleteOldMerakiAccessPointsObservations = async (): Promise<void> => {
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
