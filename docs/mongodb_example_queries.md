# MongoDB Example Queries

## Parkings

### Average free and taken places grouped by days and hours

```
db.parkings_history.aggregate(
    [
        {
            $match: {
                id: 534015
            }
        },
        {
            "$group": {
                "_id": {
                    "parking_id": "$id",
                    "hour": {
                        "$dateToString": {
                            "format": "%H",
                            "date": {
                                "$toDate": "$timestamp"
                            }
                        }
                    },
                    "dayOfWeek": {
                        "$dayOfWeek": {
                            "$toDate": "$timestamp"
                        }
                    }
                },
                "avg_taken": {
                    "$avg": "$num_of_taken_places"
                }
            }
        },
        {
            "$sort": {
                "_id.dayOfWeek": 1,
                "_id.hour": 1
            }
        },
    ]
)
```