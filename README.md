# Data Platform Integration Engine

Integration Engine of the Data Platform System.

Developed by http://operatorict.cz

## Prerequisites

- node.js
- mongo
- npm
- data-platform-schema-definitions module

## Installation

Install Node, MongoDB

Install all npm modules using command:
```
npm install
```

## Compilation of typescript code

To compile typescript code into js one-time

```
npm run buld
```
or run this, to watch all changes
```
npm run build-watch
```
from the application's root directory.


## Running MongoDB database

Run Mongo Daemon by:
```
/usr/bin/mongod
```
on Unix, or
```
C:\Program Files\MongoDB\Server\*.*\bin\mongod.exe
```
on Windows


## Run

```
npm start
```

from the application's root directory.

Application is now running locally and processing messages from the queue.


## Tests

To run all test defined in /test directory simply run this command:
```
npm test
```
from the application's root directory. All tests should pass.

To run all DataSources tests defined in /test/datasources directory run this command :
```
npm run datasourcesTest
```
from the application's root directory. **This kind of tests sends the report email while tests fails.**


## Problems?

Contact benak@operatorict.cz or vycpalek@operatorict.cz

## Useful tips & links
[Installing MongoDB database](https://docs.mongodb.com/master/tutorial/install-mongodb-on-debian/?_ga=1.255632584.174019589.1492515586)

### Installing MongoDB
Install MongoDB from package

Binaries for MongoDB database are in `/usr/bin/` on Unix or `C:\Program Files\MongoDB\Server\3.4\bin` on Windows

For example run Mongo Shell by:
```
/usr/bin/mongo
```
on Unix, or
```
C:\Program Files\MongoDB\Server\3.4\bin\mongo.exe
```
on Windows

Create a folder `/data/db` if it doesn't exist -- MongoDB stores its data there (Unix systems)