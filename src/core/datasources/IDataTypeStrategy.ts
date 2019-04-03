"use strict";

export interface IJSONSettings {

    /** Path to the sub-property which contains the results (separated by dot), e.g. "result.objects" */
    resultsPath: string;
}

export interface ICSVSettings {

    /** CSVTOJSON library parameters */
    csvtojsonParams: object;

    /** CSVTOJSON library line transformation */
    subscribe: (json: any) => any;
}

export interface IXMLSettings {

    /** Path to the sub-property which contains the results (separated by dot), e.g. "result.objects" */
    resultsPath: string;

    /** XML2JS library parameters */
    xml2jsParams: object;
}

export interface IDataTypeStrategy {

    setDataTypeSettings: (settings: IJSONSettings | ICSVSettings | IXMLSettings) => void;

    setFilter: (filterFunction: (item: any) => any) => void;

    parseData: (data: any) => Promise<any>;

}
