# Configuration files

All configuration files used by ConfigLoader (`src/core/cofig/ConfigLoader.ts`) are located in `config/` directory. The configuration files are saved in JSON format.

## Datasources (`datasources.json`)

This config contains all urls (apikes, credentials, headers, etc.) of resources which are used by integration-engine.

**Configuration in file `datasources.json` is merged with configuration in file `datasources.default.json`.**

Example:

```datasources.json
{
    "ExampleDatasource": "https://example.com/api",
    "ExampleSecrets: {
        "username": "user",
        "password": "password"
    }
}
```

## Queues Blacklist (`queuesBlacklist.json`)

This config contains all datasets (queues) which are currently not used by integration-engine. It means the integration-engine do not process the queues which are write in this config.

**Configuration in file `queuesBlacklist.json` replaces whole configuration in file `queuesBlacklist.default.json`.**

Example:

```queuesBlacklist.json
{
    "BicycleCounters": [],
    "Parkings": ["saveDataToHistory", "updateAverageOccupancy"]
}
```
Where the `BicycleCounters` dataset has blacklisted all queues and the `Parkings` dataset has blacklisted only mentioned queues, in this case `saveDataToHistory` and `updateAverageOccupancy`.
