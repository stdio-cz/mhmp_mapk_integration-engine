"use strict";

export default interface IModel {

    /** Model name */
    name: string;

    /** Validates and Saves transformed element or collection to database. */
    SaveToDb(data, tmp);

    /** Deletes all data from table. */
    Truncate?(tmp);

    FindAndCountAll?(opts);

/*
    -- MONGO --
    model name
    model schema
    model indexes
    collection name
    has tmp collection
        tmp collection name
        method replace/rename collections
    validator
    search path
    results path
    select
    is insert only or insert or update
    method save
        method update values
    method truncate
    method get one or find

    -- POSTGRESQL --
    model name
    table name
    table attributes
        (attributes to remove)
    table additional settings
        e.g. indexes
    validator
    is insert only or insert or update
    method save
        method update values
    method truncate

    VehiclePositionsTripsModel
    VehiclePositionsPositionsModel
    MerakiAccessPointsTagsModel
    MetadataModel
*/
}
