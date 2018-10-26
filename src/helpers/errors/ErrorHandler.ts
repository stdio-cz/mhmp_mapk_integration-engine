"use strict";

const errorLog = require("debug")("data-platform:integration-engine:error");
const log = require("debug")("data-platform:integration-engine");

export class ErrorHandler {

    public handle = async (err: any) => {
        let toReturn: any;

        if (err.isOperational) {
            errorLog(err.toString());
            switch (err.code) {
                case 1005:
                    toReturn = err.toObject();
                    break;
                default:
                    toReturn = { error_message: "Undefined error code" };
                    break;
            }
        } else { // Unexpected non-operational error, handle it!
            errorLog(err);
            process.exit(0); // if anything fails, process is killed
        }

        return toReturn;
    }
}

export default new ErrorHandler().handle;
