"use strict";

export default interface ISourceRequest {

    /** (optional) Data to send with request, e.g. credentials */
    body?: string;

    /** HTTP method */
    method: string;

    /** Url of the data source. */
    url: string;

    /** Object with HTTP headers. */
    headers: object;
}
