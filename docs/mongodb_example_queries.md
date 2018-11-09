# MongoDB Example Queries

## Parkings

### Average free and taken places grouped by days and hours

```
db.parkingshists.aggregate(
    [
        {
            $match: {
                id: 534016
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d %H",
                        "date": {
                            "$add": [
                                new Date(0),
                                "$timestamp"
                            ]
                        }
                    }
                },
                "avg_free": {
                    "$avg": "$num_of_free_places"
                },
                "avg_taken": {
                    "$avg": "$num_of_taken_places"
                }
            }
        }
    ]
)
```