# Data Platform Integration Engine Error Codes

## Error Codes thrown with CustomError class

- Connection Errors
    - 1001: Error while connecting to {name}.
    - 1002: {name} connection not exists. Firts call connect() method.
    - 1003: Sending the message to exchange failed.
- Datasources Errors
    - 2001: Retrieving of the source data failed.
    - 2002: Error while getting data from server.
    - 2003: Error while parsing source data.
- Transformations Errors
    - 3001: Sorted Waste Containers were not set. Use method setContaners().
    - 3002: {name} must be a valid number.
- Models Errors
    - 4001: Error while saving to database.
    - 4002: Error while truncating data.
    - 4003: Model data was not found.
    - 4004: Error while getting from database.
- Workers Errors
    - 5001: Error while updating {name}. // warning
    - 5002: Error while purging old data.
    - 5003: Error while sending the POST request.
    - 5004: Error while checking RopidGTFS saved rows.
- Other Errors
    - 6001: Method is not implemented.
    - 6002: Retrieving of the open street map nominatim data failed. // warning
