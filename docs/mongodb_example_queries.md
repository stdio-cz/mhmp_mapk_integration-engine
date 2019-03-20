# MongoDB Example Queries

## Parkings

### Average free and taken places grouped by days and hours

```
db.parkings_history.aggregate(
    [
        { $match: { $and: [ { id: 534015 }, { timestamp: { $gte: 1550220133 }} ] }},
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
                        "$subtract": [ {"$dayOfWeek": { "$toDate": "$timestamp" }}, 1 ]
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