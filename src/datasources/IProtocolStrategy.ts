"use strict";

export interface IHTTPSettings {
    /** (optional) Data to send with request, e.g. credentials */
    body?: object;

    /** Object with HTTP headers. */
    headers: object;

    /** (optional) Is JSON payload */
    json?: boolean;

    /** HTTP method */
    method: string;

    /** Url of the data source. */
    url: string;
}

export interface IFTPSettings {

    /** Filename of the data source. */
    filename: string;

    /** Url of the ftp host. */
    url: string;

    /** Path to file. */
    path: string;

    isCompressed?: boolean;
    hasSubFiles?: boolean;
    whitelistedFiles?: string[];
    onlySavedToTmpDir?: boolean;
}

export interface IProtocolStrategy {

    setConnectionSettings: (settings: IHTTPSettings | IFTPSettings) => void;

    getData: () => Promise<any>;

    getLastModified: () => Promise<any>;

}
