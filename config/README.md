# Configuration files

## Datasources (`datasources.json`)

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

Example:

```queuesBlacklist.json
{
    "MerakiAccessPoints": [],
    "Parkings": ["saveDataToHistory", "updateAverageOccupancy"]
}
```
Where the `MerakiAccessPoints` dataset has blacklisted all queues and the `Parkings` dataset has blacklisted only mentioned queues, in this case `saveDataToHistory` and `updateAverageOccupancy`.
