"use strict";

import log from "../Logger";
import CustomError from "./CustomError";

class ErrorHandler {

    public handle = async (err: CustomError|Error) => {

        if (err instanceof CustomError && err.isOperational) {
            log.error(err.toString());
            return err.toObject();
        } else { // Unexpected non-operational error, handle it!
            log.fatal(err.toString());
            process.exit(0); // if anything fails, process is killed
        }

    }
}

export default new ErrorHandler().handle;
