"use strict";

export default interface IModel {

    /** Model name */
    name: string;
    sort;
    where;

    /**
     * Data validation
     *
     * @param {object} data Input data
     * @returns {boolean} True or false if data are valid or not.
     */
    Validate(data: object);
    SaveToDb(data);
    RemoveOldRecords(refreshTimeInMinutes);

}
