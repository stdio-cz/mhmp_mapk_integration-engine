"use strict";

export interface IHTTPSettings {
    /** (optional) Data to send with request, e.g. credentials */
    body?: any;

    /** Object with HTTP headers. */
    headers: object;

    /** (optional) Is JSON payload */
    json?: boolean;

    /** HTTP method */
    method: string;

    /** Url of the data source. */
    url: string;

    strictSSL?: boolean;
    encoding?: any;
    rejectUnauthorized?: boolean;
    isCompressed?: boolean;
    whitelistedFiles?: string[];
}

export interface IFTPSettings {

    /** Filename of the data source. */
    filename: string;

    /** Url of the ftp host. */
    url: string | { host: string, password: string, secure?: boolean, user: string };

    /** Path to file. */
    path: string;

    /** Tmp directory */
    tmpDir: string;

    isCompressed?: boolean;
    hasSubFiles?: boolean;
    whitelistedFiles?: string[];
}

export interface IProtocolStrategy {

    setConnectionSettings(settings: IHTTPSettings | IFTPSettings): void;

    getData(): Promise<any>;

    getLastModified(): Promise<any>;

}