"use strict";

import Validator from "../helpers/Validator";

export default abstract class BaseModel {

    /** Model name */
    public abstract name: string;
    /** Saves transformed element or collection to database and updates refresh timestamp. */
    public abstract SaveToDb;
    /** Validation helper */
    protected abstract validator: Validator;

}
