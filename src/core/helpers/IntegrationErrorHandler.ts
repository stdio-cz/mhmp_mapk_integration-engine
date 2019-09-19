"use strict";

import { CustomError, ErrorHandler, ICustomErrorObject } from "@golemio/errors";
import { log } from "./";

export interface IExtendedCustomErrorObject extends ICustomErrorObject {
    ack: boolean;
}

/**
 * Class responsible for error handling in the app. Catches errors and based on their type performs some action.
 *
 * Extends ErrorHandler
 */
export class IntegrationErrorHandler extends ErrorHandler {

    /**
     * Handle the error. The function logs the error, kills the application if it's unknown non-operational error.
     *
     * @param err Error (CustomError) object to catch and process
     */
    public static handle(err: Error | CustomError): IExtendedCustomErrorObject {

        const warningErrorCodes: number[] = [
            5001, // Error while updating {name}.
            6002, // Retrieving of the open street map nominatim data failed.
        ];

        if (err instanceof CustomError && err.isOperational) {
            // is warning
            if (err.code && warningErrorCodes.indexOf(err.code) !== -1) {
                log.warn(err.toString());
                return { ...err.toObject(), ...{ ack: true } };
            // is error
            } else {
                log.error(err.toString());
                return { ...err.toObject(), ...{ ack: false } };
            }
        } else { // Unexpected non-operational error, handle it!
            log.error(err.toString());
            // if anything fails, process is killed
            return process.exit((err instanceof CustomError && err.code) ? err.code : 1);
        }
    }
}
