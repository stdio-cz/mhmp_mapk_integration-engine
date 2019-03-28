"use strict";

import { log } from "../";
import { CustomError } from "./";

class ErrorHandler {

    public handle = async (err: CustomError|Error) => {

        if (err instanceof CustomError && err.isOperational) {
            log.error(err.toString());
            return err.toObject();
        } else { // Unexpected non-operational error, handle it!
            log.error(err.toString());
            process.exit(1); // if anything fails, process is killed
        }

    }
}

const handleError = new ErrorHandler().handle;

export { handleError };
