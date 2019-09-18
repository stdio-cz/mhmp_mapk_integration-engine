# Configuration files

TODO Add to `docs/` folder.

## Datasources (`datasources.json`)

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

**Configuration in file `queuesBlacklist.json` replaces whole configuration in file `queuesBlacklist.default.json`.**

Example:

```queuesBlacklist.json
{
    "MerakiAccessPoints": [],
    "Parkings": ["saveDataToHistory", "updateAverageOccupancy"]
}
```
Where the `MerakiAccessPoints` dataset has blacklisted all queues and the `Parkings` dataset has blacklisted only mentioned queues, in this case `saveDataToHistory` and `updateAverageOccupancy`.
