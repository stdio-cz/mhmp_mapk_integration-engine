"use strict";

export default interface IModel {

    /** Model name */
    name: string;

    /** Validates and Saves transformed element or collection to database. */
    SaveToDb(data, tmp);

    /** Deletes all data from table. */
    Truncate?(tmp);

    FindAndCountAll?(opts);
}
