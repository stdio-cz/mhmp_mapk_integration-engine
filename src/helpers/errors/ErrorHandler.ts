"use strict";

const errorLog = require("debug")("data-platform:integration-engine:error");

class ErrorHandler {

    public handle = async (err: any) => {

        if (err.isOperational) {
            errorLog(err.toString());
            return err.toObject();
        } else { // Unexpected non-operational error, handle it!
            errorLog(err);
            process.exit(0); // if anything fails, process is killed
        }

    }
}

export default new ErrorHandler().handle;
