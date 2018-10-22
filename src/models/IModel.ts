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
    GetAll(limit?, offset?);
    GetOne(id);
    SaveToDb?(data);
    RemoveOldRecords?(refreshTimeInMinutes);

}
