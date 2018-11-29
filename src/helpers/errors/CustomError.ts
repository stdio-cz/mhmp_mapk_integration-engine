"use strict";

const config = require("../../config/ConfigLoader");

export default class CustomError extends Error {

    /** Error description */
    public name: string;
    /** Defines that error is operational */
    public isOperational?: boolean;
    /** Name of the class which throws error */
    public className?: string;
    /** Error code for better identifing type of error */
    public code?: number;
    /** Additional info about error */
    public info?: string;

    constructor(message: string, isOperational?: boolean, className?: string, code?: number, info?: string) {
        super(message);
        this.name = (this.constructor as any).name;
        this.message = message;
        this.isOperational = isOperational;
        this.className = className;
        this.code = code;
        this.info = info;
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Returns complete error description as string.
     */
    public toString = (): string => {
        return ((this.className) ? "\"" + this.className + "\" " : "")
            + ((this.code) ? "[" + this.code + "] " : "")
            + this.message
            + ((this.info) ? " (" + this.info + ")" : "")
            + ((config.NODE_ENV === "development") ? "\n" + this.stack : "");
    }

    /**
     * Returns complete error description as object.
     */
    public toObject = (): {error_message: string, error_code?: number, error_info?: string, stack_trace?: any} => {
        const toReturn: {error_message: string, error_class_name?: string, error_code?: number,
                error_info?: string, stack_trace?: any} = {
            error_message: this.message,
        };
        if (this.className) {
            toReturn.error_class_name = this.className;
        }
        if (this.code) {
            toReturn.error_code = this.code;
        }
        if (this.info) {
            toReturn.error_info = this.info;
        }
        if (config.NODE_ENV === "development") {
            toReturn.stack_trace = this.stack;
        }
        return toReturn;
    }
}
